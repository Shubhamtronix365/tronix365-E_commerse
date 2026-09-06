import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from main import app
from database import SessionLocal
from models import UserDB, BlogPostDB, RefreshTokenDB
from auth import get_password_hash, create_access_token
from deps import limiter

client = TestClient(app)

TEST_AUTHOR_EMAIL = "test_moderated_author@tronix365.in"
TEST_ADMIN_EMAIL = "test_moderated_admin@tronix365.in"
TEST_INITIAL_PASSWORD = "ValidInitialPass123!"


def cleanup_data():
    db: Session = SessionLocal()
    try:
        db.query(BlogPostDB).filter(BlogPostDB.title.like("MODTEST_%")).delete(synchronize_session=False)
        users = db.query(UserDB).filter(
            UserDB.email.in_([TEST_AUTHOR_EMAIL, TEST_ADMIN_EMAIL, "generated_author_test@tronix365.in"])
        ).all()
        user_ids = [u.id for u in users]
        if user_ids:
            db.query(RefreshTokenDB).filter(RefreshTokenDB.user_id.in_(user_ids)).delete(synchronize_session=False)
        db.query(UserDB).filter(
            UserDB.email.in_([TEST_AUTHOR_EMAIL, TEST_ADMIN_EMAIL, "generated_author_test@tronix365.in"])
        ).delete(synchronize_session=False)
        db.commit()
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_teardown_moderation():
    limiter.enabled = False
    cleanup_data()

    db: Session = SessionLocal()
    try:
        author = UserDB(
            email=TEST_AUTHOR_EMAIL,
            full_name="Moderated Author",
            hashed_password=get_password_hash(TEST_INITIAL_PASSWORD),
            role="blog_author",
            is_active=True,
        )
        admin = UserDB(
            email=TEST_ADMIN_EMAIL,
            full_name="Moderated Admin",
            hashed_password=get_password_hash(TEST_INITIAL_PASSWORD),
            role="admin",
            is_active=True,
        )
        db.add(author)
        db.add(admin)
        db.commit()
    finally:
        db.close()

    yield

    cleanup_data()
    limiter.enabled = True


def get_token_header(email: str, role: str):
    token = create_access_token(data={"sub": email, "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_author_submission_forces_pending_approval():
    author_headers = get_token_header(TEST_AUTHOR_EMAIL, "blog_author")
    payload = {
        "title": "MODTEST_ Author Post Requiring Approval",
        "content": "<p>Content written by an author awaiting admin review.</p>",
        "category": "Tutorials",
        "is_published": True,  # Author attempts to publish directly
    }
    response = client.post("/admin/blogs", json=payload, headers=author_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["is_published"] is False
    assert data["status"] == "pending_approval"
    assert data["author_id"] == TEST_AUTHOR_EMAIL

    # Verify public endpoints DO NOT expose this pending article
    public_res = client.get("/blogs")
    assert public_res.status_code == 200
    public_titles = [p["title"] for p in public_res.json()["posts"]]
    assert "MODTEST_ Author Post Requiring Approval" not in public_titles

    # Verify slug endpoint returns 404 for unapproved post
    slug_res = client.get(f"/blogs/{data['slug']}")
    assert slug_res.status_code == 404


def test_admin_approval_and_rejection_workflow():
    author_headers = get_token_header(TEST_AUTHOR_EMAIL, "blog_author")
    admin_headers = get_token_header(TEST_ADMIN_EMAIL, "admin")

    # Author creates a draft then submits it
    create_res = client.post(
        "/admin/blogs",
        json={
            "title": "MODTEST_ Workflow Article",
            "content": "<p>Comprehensive guide to robotics.</p>",
            "is_published": False,
        },
        headers=author_headers,
    )
    assert create_res.status_code == 201
    post_id = create_res.json()["id"]
    slug = create_res.json()["slug"]

    # Author submits for approval via toggle-publish
    toggle_res = client.post(f"/admin/blogs/{post_id}/toggle-publish", headers=author_headers)
    assert toggle_res.status_code == 200
    assert toggle_res.json()["status"] == "pending_approval"
    assert toggle_res.json()["is_published"] is False

    # Admin approves the post
    approve_res = client.post(f"/admin/blogs/{post_id}/approve", headers=admin_headers)
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "published"
    assert approve_res.json()["is_published"] is True

    # Now public endpoints MUST expose it
    public_slug_res = client.get(f"/blogs/{slug}")
    assert public_slug_res.status_code == 200
    assert public_slug_res.json()["title"] == "MODTEST_ Workflow Article"

    # Admin rejects with feedback
    reject_res = client.post(
        f"/admin/blogs/{post_id}/reject",
        json={"reason": "Please add circuit schematics and pinout table."},
        headers=admin_headers,
    )
    assert reject_res.status_code == 200
    assert reject_res.json()["status"] == "rejected"
    assert "circuit schematics" in reject_res.json()["rejection_reason"]

    # Public endpoint must 404 again after rejection
    public_slug_res2 = client.get(f"/blogs/{slug}")
    assert public_slug_res2.status_code == 404


def test_strong_password_policy_enforcement():
    author_headers = get_token_header(TEST_AUTHOR_EMAIL, "blog_author")

    # Weak 1: too short (< 8 chars)
    res_short = client.put(
        "/blogs/author/credentials",
        json={"current_password": TEST_INITIAL_PASSWORD, "new_password": "Short1!"},
        headers=author_headers,
    )
    assert res_short.status_code == 400
    assert "8 characters" in res_short.json()["detail"]

    # Weak 2: no uppercase
    res_no_upper = client.put(
        "/blogs/author/credentials",
        json={"current_password": TEST_INITIAL_PASSWORD, "new_password": "nouppercase123!"},
        headers=author_headers,
    )
    assert res_no_upper.status_code == 400
    assert "uppercase" in res_no_upper.json()["detail"]

    # Weak 3: no number
    res_no_num = client.put(
        "/blogs/author/credentials",
        json={"current_password": TEST_INITIAL_PASSWORD, "new_password": "NoNumbersHere!"},
        headers=author_headers,
    )
    assert res_no_num.status_code == 400
    assert "number" in res_no_num.json()["detail"]

    # Weak 4: no special character
    res_no_sym = client.put(
        "/blogs/author/credentials",
        json={"current_password": TEST_INITIAL_PASSWORD, "new_password": "NoSymbolsHere123"},
        headers=author_headers,
    )
    assert res_no_sym.status_code == 400
    assert "special character" in res_no_sym.json()["detail"]

    # Strong: valid password
    res_valid = client.put(
        "/blogs/author/credentials",
        json={"current_password": TEST_INITIAL_PASSWORD, "new_password": "SuperSecurePass@2026"},
        headers=author_headers,
    )
    assert res_valid.status_code == 200
    assert "successfully" in res_valid.json()["message"]


def test_admin_generate_author_account():
    admin_headers = get_token_header(TEST_ADMIN_EMAIL, "admin")
    author_headers = get_token_header(TEST_AUTHOR_EMAIL, "blog_author")

    # Non-admin cannot generate authors
    res_unauth = client.post(
        "/admin/authors/generate",
        json={"name": "Jane Doe"},
        headers=author_headers,
    )
    assert res_unauth.status_code == 403

    # Admin generates author
    res_gen = client.post(
        "/admin/authors/generate",
        json={"name": "Dr. Sarah Robotics", "author_id": "generated_author_test@tronix365.in"},
        headers=admin_headers,
    )
    assert res_gen.status_code == 200
    gen_data = res_gen.json()
    assert gen_data["author_id"] == "generated_author_test@tronix365.in"
    assert gen_data["role"] == "blog_author"
    assert len(gen_data["password"]) >= 16

    # Admin lists authors
    res_list = client.get("/admin/authors", headers=admin_headers)
    assert res_list.status_code == 200
    emails = [a["email"] for a in res_list.json()]
    assert "generated_author_test@tronix365.in" in emails

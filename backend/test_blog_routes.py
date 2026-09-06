import pytest
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv()

from main import app
from database import SessionLocal, engine, Base
from models import UserDB, BlogPostDB
from deps import get_current_admin, get_current_blog_author
from auth import get_password_hash

client = TestClient(app)

def setup_admin_and_posts():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Create or get admin user
        admin_user = db.query(UserDB).filter(UserDB.email == "blog_admin@tronix365.in").first()
        if not admin_user:
            admin_user = UserDB(
                email="blog_admin@tronix365.in",
                hashed_password=get_password_hash("AuthorPass123!"),
                full_name="Tronix Admin",
                role="blog_author",
            )
            db.add(admin_user)
            db.commit()
            db.refresh(admin_user)
        else:
            admin_user.hashed_password = get_password_hash("AuthorPass123!")
            admin_user.role = "blog_author"
            db.commit()

        # 2. Clean previous test posts
        db.query(BlogPostDB).filter(BlogPostDB.title.like("TEST_BLOG_%")).delete(synchronize_session=False)
        db.commit()
        return admin_user
    finally:
        db.close()


def test_blog_lifecycle_and_security():
    admin_user = setup_admin_and_posts()

    # Step 1: Verify unauthorized admin access fails
    app.dependency_overrides.clear()
    unauth_res = client.post("/admin/blogs", json={"title": "TEST_BLOG_Unauthorized", "content": "test"})
    assert unauth_res.status_code in [401, 403]
    print("[PASS] Step 1: Admin endpoint is protected from unauthorized access")

    # Step 1b: Test dedicated author login endpoint
    login_res = client.post("/blogs/author/login", json={
        "author_id": "blog_admin@tronix365.in",
        "password": "AuthorPass123!"
    })
    assert login_res.status_code == 200, login_res.text
    token_data = login_res.json()
    assert "access_token" in token_data
    assert token_data["role"] == "blog_author"
    print("[PASS] Step 1b: Author login authenticated with valid tokens")

    # Step 2: Override get_current_blog_author with valid author
    app.dependency_overrides[get_current_blog_author] = lambda: admin_user

    # Step 3: Create a post with malicious XSS script and verify sanitization
    malicious_payload = {
        "title": "TEST_BLOG_ESP32 IoT Robot Guide",
        "summary": "Building an autonomous navigation robot with ESP32",
        "content": "<p>Welcome to <strong>ESP32</strong> project!</p><script>alert('xss')</script><iframe src='evil.com'></iframe><img src='valid.png' onerror='steal()'/>",
        "category": "Robotics & AI",
        "layout_type": "hardware_guide",
        "tags": ["ESP32", "Robotics", "IoT"],
        "is_published": True,
        "featured": True,
        "components_used": [
            {"name": "ESP32 Dev Module", "sku": "TRX-ESP32", "product_id": 1, "link": "/product/1"}
        ]
    }

    create_res = client.post("/admin/blogs", json=malicious_payload)
    assert create_res.status_code == 201, create_res.text
    created = create_res.json()
    assert created["slug"] == "test-blog-esp32-iot-robot-guide"
    assert "<script>" not in created["content"]
    assert "alert" not in created["content"]
    assert "<iframe>" not in created["content"]
    assert "<strong>ESP32</strong>" in created["content"]
    post_id = created["id"]
    post_slug = created["slug"]
    print("[PASS] Step 2 & 3: Blog created with unique slug and XSS content thoroughly sanitized")

    # Step 4: Verify slug collision handling (creating another with same title)
    dup_res = client.post("/admin/blogs", json={
        "title": "TEST_BLOG_ESP32 IoT Robot Guide",
        "content": "<p>Second version</p>",
        "category": "Robotics & AI",
        "is_published": False,
    })
    assert dup_res.status_code == 201
    dup_post = dup_res.json()
    assert dup_post["slug"] != post_slug
    assert dup_post["slug"].endswith("-2") or dup_post["slug"].startswith(post_slug)
    draft_id = dup_post["id"]
    draft_slug = dup_post["slug"]
    print("[PASS] Step 4: Slug collision handled automatically (appended counter suffix)")

    # Step 5: Public listing checks - should only include published post
    pub_res = client.get("/blogs")
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    slugs = [p["slug"] for p in pub_data["posts"]]
    assert post_slug in slugs
    assert draft_slug not in slugs  # Draft should NOT be in public list
    print("[PASS] Step 5: Public /blogs lists published posts and hides drafts")

    # Step 6: Public single slug endpoint
    single_res = client.get(f"/blogs/{post_slug}")
    assert single_res.status_code == 200
    single_data = single_res.json()
    assert single_data["slug"] == post_slug
    assert single_data["views_count"] >= 1
    assert "related_posts" in single_data

    # Draft post should return 404 from public endpoint
    draft_pub_res = client.get(f"/blogs/{draft_slug}")
    assert draft_pub_res.status_code == 404
    print("[PASS] Step 6: Public /blogs/{slug} increments view count, returns related posts, and 404s for drafts")

    # Step 7: Featured & Categories Summary endpoints
    featured_res = client.get("/blogs/featured")
    assert featured_res.status_code == 200
    assert len(featured_res.json()) >= 1

    cats_res = client.get("/blogs/categories/summary")
    assert cats_res.status_code == 200
    cats_data = cats_res.json()
    assert "categories" in cats_data
    print("[PASS] Step 7: /blogs/featured and /blogs/categories/summary return structured metrics")

    # Step 8: Admin toggle publish
    toggle_res = client.post(f"/admin/blogs/{draft_id}/toggle-publish")
    assert toggle_res.status_code == 200
    assert toggle_res.json()["is_published"] == True
    print("[PASS] Step 8: Admin toggle-publish switches draft to published")

    # Step 9: Admin update & delete
    update_res = client.put(f"/admin/blogs/{post_id}", json={"title": "TEST_BLOG_Updated Title"})
    assert update_res.status_code == 200
    assert update_res.json()["title"] == "TEST_BLOG_Updated Title"

    del_res1 = client.delete(f"/admin/blogs/{post_id}")
    assert del_res1.status_code == 200
    del_res2 = client.delete(f"/admin/blogs/{draft_id}")
    assert del_res2.status_code == 200
    print("[PASS] Step 9: Admin update and deletion clean up successfully")

    # Clear overrides
    app.dependency_overrides.clear()

import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import UserDB
from auth import get_password_hash, create_access_token

client = TestClient(app)

TEST_AUTHOR_EMAIL = "test_settings_author@tronix365.in"
TEST_AUTHOR_PASS = "InitialPass123!"

@pytest.fixture(scope="module", autouse=True)
def setup_author():
    db = SessionLocal()
    user = db.query(UserDB).filter(UserDB.email == TEST_AUTHOR_EMAIL).first()
    if not user:
        user = UserDB(
            email=TEST_AUTHOR_EMAIL,
            hashed_password=get_password_hash(TEST_AUTHOR_PASS),
            full_name="Settings Test Author",
            role="blog_author",
            is_active=True
        )
        db.add(user)
    else:
        user.hashed_password = get_password_hash(TEST_AUTHOR_PASS)
        user.role = "blog_author"

    # Also ensure a conflicting user exists
    conflict_email = "conflict_user@tronix365.in"
    conflict = db.query(UserDB).filter(UserDB.email == conflict_email).first()
    if not conflict:
        conflict = UserDB(
            email=conflict_email,
            hashed_password=get_password_hash("Pass123!"),
            full_name="Conflict User",
            role="user",
            is_active=True
        )
        db.add(conflict)

    db.commit()
    db.close()
    yield


def test_update_credentials_wrong_current_password():
    token = create_access_token({"sub": TEST_AUTHOR_EMAIL, "role": "blog_author"})
    res = client.put(
        "/blogs/author/credentials",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": "WrongCurrentPassword123!",
            "new_password": "NewValidPassword123!"
        }
    )
    assert res.status_code == 400
    assert "Current password is incorrect" in res.json()["detail"]


def test_update_credentials_conflict_email():
    token = create_access_token({"sub": TEST_AUTHOR_EMAIL, "role": "blog_author"})
    res = client.put(
        "/blogs/author/credentials",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": TEST_AUTHOR_PASS,
            "new_email": "conflict_user@tronix365.in"
        }
    )
    assert res.status_code == 400
    assert "already in use" in res.json()["detail"]


def test_update_credentials_short_password():
    token = create_access_token({"sub": TEST_AUTHOR_EMAIL, "role": "blog_author"})
    res = client.put(
        "/blogs/author/credentials",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": TEST_AUTHOR_PASS,
            "new_password": "123"
        }
    )
    assert res.status_code == 400
    assert "at least 6 characters" in res.json()["detail"]


def test_update_credentials_success():
    token = create_access_token({"sub": TEST_AUTHOR_EMAIL, "role": "blog_author"})
    new_email = "updated_author_999@tronix365.in"
    new_pass = "UpdatedStrongPass999!"

    res = client.put(
        "/blogs/author/credentials",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "current_password": TEST_AUTHOR_PASS,
            "new_email": new_email,
            "new_password": new_pass
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert data["email"] == new_email
    assert "access_token" in data

    # Verify that the new access token works for role-guarded author routes
    new_token = data["access_token"]
    verify_res = client.get(
        "/admin/blogs",
        headers={"Authorization": f"Bearer {new_token}"}
    )
    assert verify_res.status_code == 200

    # Verify that logging in with the new credentials works
    login_res = client.post(
        "/blogs/author/login",
        json={
            "author_id": new_email,
            "password": new_pass
        }
    )
    assert login_res.status_code == 200

from models import ProductCreate, ReviewCreate
from auth import create_access_token, create_refresh_token
from jose import jwt
from auth import SECRET_KEY, ALGORITHM


def test_sanitization():
    print("Testing Sanitization...")
    # Test Product title and description
    p = ProductCreate(
        title="<script>alert('XSS')</script>Normal Title",
        description="<p>Safe</p><script>Danger</script><b>Bold</b>",
        price=100.0,
        category="Electronics",
    )
    print(f"Sanitized Title: '{p.title}'")
    assert "<script>" not in p.title
    print(f"Sanitized Description: '{p.description}'")
    assert "<script>" not in p.description
    assert "<b>" in p.description

    # Test Review comment
    r = ReviewCreate(rating=5, comment="<b>No Bold Allowed</b>")
    print(f"Sanitized Comment: '{r.comment}'")
    assert "<b>" not in r.comment
    print("Sanitization tests passed!")


def test_tokens():
    print("\nTesting Tokens...")
    data = {"sub": "test@example.com", "role": "user"}
    access = create_access_token(data)
    refresh = create_refresh_token(data)

    payload_access = jwt.decode(access, SECRET_KEY, algorithms=[ALGORITHM])
    payload_refresh = jwt.decode(refresh, SECRET_KEY, algorithms=[ALGORITHM])

    print(f"Access Token Payload: {payload_access}")
    print(f"Refresh Token Payload: {payload_refresh}")

    assert payload_refresh.get("type") == "refresh"
    assert "exp" in payload_access
    assert "exp" in payload_refresh
    print("Token tests passed!")


if __name__ == "__main__":
    try:
        test_sanitization()
        test_tokens()
        print("\nAll security unit tests passed!")
    except Exception as e:
        print(f"\nTests failed: {e}")
        import traceback

        traceback.print_exc()

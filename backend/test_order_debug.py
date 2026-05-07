import requests

BASE_URL = "http://127.0.0.1:8000"


def test():
    # 1. Login (or register) to get a token
    res = requests.post(
        f"{BASE_URL}/login",
        data={"username": "test422@example.com", "password": "password123"},
    )
    token = res.json().get("access_token")

    if not token:
        print("Failed to get token:", res.text)
        return

    print("Got token", token[:10])

    # 2. Call /orders/user
    res = requests.get(
        f"{BASE_URL}/orders/user?skip=0&limit=5",
        headers={"Authorization": f"Bearer {token}"},
    )

    print(f"Status: {res.status_code}")
    print(f"Response: {res.text}")


if __name__ == "__main__":
    test()

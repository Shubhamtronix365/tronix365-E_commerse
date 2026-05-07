import requests
import json

BASE_URL = "http://localhost:8000"


def test_dashboard_flow():
    # 1. Signup
    email = "test_dashboard_user@example.com"
    password = "password123"
    payload = {
        "email": email,
        "password": password,
        "full_name": "Dashboard Tester",
        "role": "user",
    }

    print(f"1. Signing up user {email}...")
    try:
        signup_res = requests.post(f"{BASE_URL}/signup", json=payload)
        if signup_res.status_code == 200:
            print("   Signup successful")
        elif signup_res.status_code == 400 and "already registered" in signup_res.text:
            print("   User already exists, proceeding to login")
        else:
            print(f"   Signup failed: {signup_res.status_code} {signup_res.text}")
            return
    except Exception as e:
        print(f"   Error during signup: {e}")
        return

    # 2. Login
    print("2. Logging in...")
    login_data = {"username": email, "password": password}

    try:
        login_res = requests.post(f"{BASE_URL}/login", data=login_data)
        if login_res.status_code != 200:
            print(f"   Login failed: {login_res.status_code} {login_res.text}")
            return

        token_data = login_res.json()
        token = token_data["access_token"]
        print("   Login successful, token received")
    except Exception as e:
        print(f"   Error during login: {e}")
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 3. Get Profile
    print("3. Fetching Profile...")
    try:
        profile_res = requests.get(f"{BASE_URL}/profile", headers=headers)
        if profile_res.status_code == 200:
            print(f"   Profile: {json.dumps(profile_res.json(), indent=2)}")
        else:
            print(
                f"   Profile fetch failed: {profile_res.status_code} {profile_res.text}"
            )
    except Exception as e:
        print(f"   Error fetching profile: {e}")

    # 4. Get Orders
    print("4. Fetching Orders...")
    try:
        orders_res = requests.get(f"{BASE_URL}/orders/user", headers=headers)
        if orders_res.status_code == 200:
            print(f"   Orders: {json.dumps(orders_res.json(), indent=2)}")
        else:
            print(f"   Orders fetch failed: {orders_res.status_code} {orders_res.text}")
    except Exception as e:
        print(f"   Error fetching orders: {e}")


if __name__ == "__main__":
    test_dashboard_flow()

import requests
import json

BASE_URL = "http://localhost:8001"


def signup_and_login(email, password, name):
    # Signup
    signup_url = f"{BASE_URL}/signup"
    signup_payload = {"email": email, "password": password, "full_name": name}
    try:
        print(f"Signing up {email}...")
        res = requests.post(signup_url, json=signup_payload)
        if res.status_code == 400 and "already registered" in res.text:
            print("User already exists, proceeding to login.")
        else:
            res.raise_for_status()
            print("Signup successful.")
    except Exception as e:
        print(f"Signup failed: {e}")
        return None

    # Login
    return login(email, password)


def login(email, password):
    url = f"{BASE_URL}/login"
    payload = {"username": email, "password": password}
    try:
        response = requests.post(url, data=payload)
        response.raise_for_status()
        return response.json().get("access_token")
    except Exception as e:
        print(f"Login failed: {e}")
        return None


def test_stats_endpoint(token):
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{BASE_URL}/admin/stats", headers=headers)
        response.raise_for_status()
        data = response.json()
        print(f"Stats Endpoint: SUCCESS")
        print(json.dumps(data, indent=2))

        required_keys = [
            "total_revenue",
            "total_orders",
            "total_products",
            "active_users",
        ]
        if all(key in data for key in required_keys):
            print("Stats structure is CORRECT.")
        else:
            print("Stats structure is INCORRECT.")

    except Exception as e:
        print(f"Stats Endpoint FAILED: {e}")


def test_pagination(endpoint, token=None):
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    print(f"\nTesting Pagination for {endpoint}...")

    try:
        # Page 1
        params1 = {"skip": 0, "limit": 2}
        res1 = requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params1)
        data1 = res1.json()
        print(f"Page 1 (Limit 2): Retrieved {len(data1)} items.")

        # Page 2
        params2 = {"skip": 2, "limit": 2}
        res2 = requests.get(f"{BASE_URL}{endpoint}", headers=headers, params=params2)
        data2 = res2.json()
        print(f"Page 2 (Limit 2): Retrieved {len(data2)} items.")

        if len(data1) > 0 and len(data2) > 0:
            if data1[0]["id"] != data2[0]["id"]:
                print("Pagination Logic: SUCCESS (Items differ between pages)")
            else:
                print(
                    "Pagination Logic: FAILED (Items identical - maybe not enough data or bug)"
                )
        else:
            print("Pagination Logic: SKIPPED (Not enough data to verify)")

    except Exception as e:
        print(f"Pagination Test FAILED: {e}")


if __name__ == "__main__":
    import time

    unique_email = f"admin_{int(time.time())}@tronix365.com"
    print(f"Logging in as {unique_email}...")

    token = signup_and_login(unique_email, "password123", "Admin User")

    if token:
        test_stats_endpoint(token)
        test_pagination("/products")  # Public
        test_pagination("/orders", token)  # Protected
        test_pagination("/orders/user", token)  # User specific
    else:
        print("Skipping authenticated tests due to login failure.")

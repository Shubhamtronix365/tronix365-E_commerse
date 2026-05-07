import requests
import json

BASE_URL = "http://localhost:8000"


def test_normalization():
    # 1. Signup/Login
    email = "norm_test@example.com"
    password = "password123"

    # Try login first
    login_res = requests.post(
        f"{BASE_URL}/login", data={"username": email, "password": password}
    )
    if login_res.status_code != 200:
        # Signup
        print("Signing up...")
        requests.post(
            f"{BASE_URL}/signup",
            json={
                "email": email,
                "password": password,
                "full_name": "Norm Tester",
                "role": "user",
            },
        )
        login_res = requests.post(
            f"{BASE_URL}/login", data={"username": email, "password": password}
        )

    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("Logged in.")

    # 2. Create Order
    print("Creating order...")
    payload = {
        "customer_email": email,
        "total_amount": 500.0,
        "items": [{"product_id": 1, "quantity": 2}, {"product_id": 2, "quantity": 1}],
        "status": "pending",
    }

    res = requests.post(f"{BASE_URL}/orders", json=payload, headers=headers)
    if res.status_code == 201:
        print("Order created successfully.")
    else:
        print(f"Failed to create order: {res.status_code} {res.text}")
        return

    # 3. Fetch Orders
    print("Fetching orders...")
    res = requests.get(f"{BASE_URL}/orders", headers=headers)
    orders = res.json()

    if isinstance(orders, list) and len(orders) > 0:
        latest = orders[-1]
        print("Latest Order Items:")
        print(json.dumps(latest["items"], indent=2))

        # Verify normalization structure
        items = latest["items"]
        if isinstance(items, list) and len(items) == 2:
            print("SUCCESS: Items retrieved correctly as a list.")
        else:
            print("FAILURE: Items structure is incorrect.")

    elif isinstance(orders, dict):
        print(f"Error fetching orders: {json.dumps(orders, indent=2)}")
    else:
        print("No orders found or unknown format.")


if __name__ == "__main__":
    test_normalization()

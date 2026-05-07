import requests
import json

BASE_URL = "http://localhost:8000"


def test_payment_init():
    print("Testing Payment Initiation...")

    # 1. Get a product to order
    print("Fetching a product...")
    res = requests.get(f"{BASE_URL}/products?limit=1")
    if res.status_code != 200 or not res.json():
        print("FAILED: Could not fetch products.")
        return

    product = res.json()[0]
    product_id = product["id"]
    print(f"Using product ID: {product_id}")

    # 2. Initiate Payment
    payment_data = {
        "amount": 100.0,
        "productinfo": "Test Product Info",
        "firstname": "Test User",
        "email": "test@example.com",
        "phone": "1234567890",
        "address_line": "123 Test St",
        "city": "Test City",
        "state": "Test State",
        "pincode": "123456",
        "items": [{"product_id": product_id, "quantity": 1}],
    }

    print("Sending payment initiation request...")
    try:
        res = requests.post(f"{BASE_URL}/payment/initiate", json=payment_data)

        if res.status_code == 200:
            print("SUCCESS: Payment initiated successfully.")
            print("Response:", res.json())
        else:
            print(f"FAILED: Status {res.status_code}")
            print("Response:", res.text)

    except Exception as e:
        print(f"Error during request: {e}")


if __name__ == "__main__":
    test_payment_init()

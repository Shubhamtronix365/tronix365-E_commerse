import requests
import json

BASE_URL = "http://localhost:8000"


def test_crud():
    print("Testing Product CRUD...")

    # 1. Create Product
    new_product = {
        "title": "Test Product",
        "description": "A product for testing CRUD",
        "price": 99.99,
        "category": "Testing",
        "image": "https://example.com/image.png",
        "stock": 10,
    }

    print(f"Creating product: {new_product['title']}...")
    res = requests.post(f"{BASE_URL}/products", json=new_product)
    if res.status_code != 201:
        print(f"FAILED to create product: {res.status_code} {res.text}")
        return

    product = res.json()
    product_id = product["id"]
    print(f"SUCCESS: Created product ID {product_id}")

    # 2. Get Product
    print(f"Fetching product ID {product_id}...")
    res = requests.get(f"{BASE_URL}/products/{product_id}")
    if res.status_code != 200:
        print(f"FAILED to get product: {res.status_code}")
        return
    print(f"SUCCESS: Fetched product: {res.json()['title']}")

    # 3. Update Product
    update_data = {"price": 149.99, "title": "Updated Test Product"}
    print(f"Updating product ID {product_id}...")
    res = requests.put(f"{BASE_URL}/products/{product_id}", json=update_data)
    if res.status_code != 200:
        print(f"FAILED to update product: {res.status_code} {res.text}")
        return

    updated_product = res.json()
    if (
        updated_product["price"] == 149.99
        and updated_product["title"] == "Updated Test Product"
    ):
        print("SUCCESS: Product updated correctly")
    else:
        print(f"FAILED: Product did not update correctly: {updated_product}")

    # 4. Delete Product
    print(f"Deleting product ID {product_id}...")
    res = requests.delete(f"{BASE_URL}/products/{product_id}")
    if res.status_code != 204:
        print(f"FAILED to delete product: {res.status_code} {res.text}")
        return
    print("SUCCESS: Product deleted")

    # 5. Verify Deletion
    res = requests.get(f"{BASE_URL}/products/{product_id}")
    if res.status_code == 404:
        print("SUCCESS: Product verified as deleted (404 Not Found)")
    else:
        print(f"FAILED: Product still exists: {res.status_code}")


if __name__ == "__main__":
    test_crud()

import requests
import os

BASE_URL = "http://localhost:8000"
TEST_IMAGE_PATH = "test_image.txt"


def test_upload():
    print("Testing Image Upload...")

    # Create a dummy image file
    with open(TEST_IMAGE_PATH, "w") as f:
        f.write("This is a test image content.")

    try:
        # Upload the file
        with open(TEST_IMAGE_PATH, "rb") as f:
            files = {"file": ("test_image.txt", f, "text/plain")}
            print("Uploading file...")
            res = requests.post(f"{BASE_URL}/upload", files=files)

        if res.status_code != 200:
            print(f"FAILED to upload: {res.status_code} {res.text}")
            return

        data = res.json()
        image_url = data.get("url")
        print(f"Upload successful. URL: {image_url}")

        if not image_url:
            print("FAILED: No URL returned")
            return

        # Verify the file is accessible
        print(f"Verifying file access at {image_url}...")
        res = requests.get(image_url)
        if res.status_code != 200:
            print(f"FAILED to access uploaded file: {res.status_code}")
            return

        if res.text == "This is a test image content.":
            print("SUCCESS: Uploaded file content verified.")
        else:
            print("FAILED: Content mismatch.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Cleanup local dummy file
        if os.path.exists(TEST_IMAGE_PATH):
            os.remove(TEST_IMAGE_PATH)


if __name__ == "__main__":
    test_upload()

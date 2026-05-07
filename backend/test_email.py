import os
import requests
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("BREVO_API_KEY")
print(f"Loaded API Key: {api_key}")
if api_key:
    print(f"Key Length: {len(api_key)}")
    print(f"First 10 chars: {api_key[:10]}")
    print(f"Last 5 chars: {api_key[-5:]}")
else:
    print("API Key is None or Empty")

url = "https://api.brevo.com/v3/smtp/email"
headers = {
    "accept": "application/json",
    "api-key": api_key,
    "content-type": "application/json",
}
data = {
    "sender": {"name": "Test", "email": "test@example.com"},
    "to": [{"email": "test@example.com", "name": "Test User"}],
    "subject": "Test Email",
    "htmlContent": "<html><body><p>Test</p></body></html>",
}

try:
    print("Sending request...")
    response = requests.post(url, headers=headers, json=data, timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Exception: {e}")

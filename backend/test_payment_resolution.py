import os
import sys

# Add backend directory to sys.path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, backend_dir)

from starlette.requests import Request
from starlette.datastructures import Headers
from routes.payment_routes import _resolve_backend_url, _resolve_frontend_url, _render_redirect_page, SUSPENDED_RENDER_HOST, ACTIVE_RENDER_HOST
from email_utils import get_canonical_backend_url

def create_mock_request(headers_dict, scheme="https", host="localhost:8000"):
    scope = {
        "type": "http",
        "method": "POST",
        "scheme": scheme,
        "server": (host.split(":")[0], int(host.split(":")[1]) if ":" in host else (443 if scheme=="https" else 80)),
        "headers": [(k.lower().encode("latin-1"), v.encode("latin-1")) for k, v in headers_dict.items()],
        "path": "/payment/callback"
    }
    return Request(scope)

print("=== RUNNING PAYMENT ROUTE RESOLUTION TESTS ===")

# Test 1: Suspended URL in BACKEND_URL env var
os.environ["BACKEND_URL"] = "https://tronix365-e-commerse.onrender.com"
os.environ["FRONTEND_URL"] = "https://www.tronix365.in/e-commerse"
req1 = create_mock_request({"host": "tronix365-e-commerse-xhlw.onrender.com"})

backend_resolved = _resolve_backend_url(req1)
frontend_resolved = _resolve_frontend_url(req1)
email_backend = get_canonical_backend_url()

print(f"Test 1 - Suspended BACKEND_URL in env:")
print(f"  _resolve_backend_url: {backend_resolved}")
print(f"  _resolve_frontend_url: {frontend_resolved}")
print(f"  get_canonical_backend_url: {email_backend}")

assert backend_resolved == f"https://{ACTIVE_RENDER_HOST}", f"Expected https://{ACTIVE_RENDER_HOST}, got {backend_resolved}"
assert frontend_resolved == "https://www.tronix365.in/e-commerse", f"Expected https://www.tronix365.in/e-commerse, got {frontend_resolved}"
assert email_backend == f"https://{ACTIVE_RENDER_HOST}", f"Expected https://{ACTIVE_RENDER_HOST}, got {email_backend}"
print("  -> TEST 1 PASSED!\n")

# Test 2: Localhost environment
os.environ["BACKEND_URL"] = "http://localhost:8000"
os.environ["FRONTEND_URL"] = "http://localhost:5173"
req2 = create_mock_request({"host": "localhost:8000"}, scheme="http", host="localhost:8000")

backend_local = _resolve_backend_url(req2)
frontend_local = _resolve_frontend_url(req2)
email_local = get_canonical_backend_url()

print(f"Test 2 - Localhost dev environment:")
print(f"  _resolve_backend_url: {backend_local}")
print(f"  _resolve_frontend_url: {frontend_local}")
print(f"  get_canonical_backend_url: {email_local}")

assert backend_local == "http://localhost:8000"
assert frontend_local == "http://localhost:5173"
assert email_local == "http://localhost:8000"
print("  -> TEST 2 PASSED!\n")

# Test 3: HTML redirect response content
target = "https://www.tronix365.in/e-commerse/payment/failure?txnid=TRONIX-123&status=payment_failed&reason=Bank%20declined"
response = _render_redirect_page(target)
content = response.body.decode("utf-8")

print("Test 3 - Auto-redirect HTML response:")
assert f'url={target}' in content
assert f'href="{target}"' in content
assert response.status_code == 200
print("  -> Contains correct meta refresh target URL")
print("  -> Contains correct fallback anchor link")
print("  -> TEST 3 PASSED!\n")

print("ALL TESTS PASSED SUCCESSFULLY!")

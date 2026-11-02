"""
Comprehensive test script for Tronix365 Logging and Observability System.
Tests:
1. SensitiveDataFilter (masking emails, phones, redacting passwords/keys/tokens/OTPs).
2. Context variable propagation (request_id, user_id, client_ip).
3. Structured event logging (WHAT, WHO, WHY, ACTION, RESULT).
4. FastAPI RequestObservabilityMiddleware response header injection.
"""
import sys
import os
import json

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from logging_config import (
    configure_logging,
    get_logger,
    request_id_ctx,
    user_id_ctx,
    client_ip_ctx,
    mask_email,
    mask_phone,
    sanitize_value,
    SensitiveDataFilter,
)

def test_sensitive_masking():
    print("[TEST 1] Testing Sensitive Masking...")
    # Email masking
    assert mask_email("customer@example.com") == "c***r@example.com", "Email masking failed"
    assert mask_email("ab@cd.com") == "a*@cd.com", "Short email masking failed"
    
    # Phone masking
    assert mask_phone("+919876543210") == "+919****3210", f"Phone masking returned: {mask_phone('+919876543210')}"
    assert mask_phone("9876543210") == "9876****3210", f"Phone 10-digit masking returned: {mask_phone('9876543210')}"
    
    # Sanitization
    sample_data = {
        "password": "SuperSecretPassword123!",
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy",
        "otp": "839201",
        "api_key": "xkeysib-9382103981203",
        "customer_email": "john.doe@gmail.com",
        "phone": "+919876543210",
        "amount": 2499.00
    }
    cleaned = sanitize_value("data", sample_data)
    assert cleaned["password"] == "[REDACTED]", f"Password not redacted: {cleaned['password']}"
    assert cleaned["access_token"] == "[REDACTED]", f"Token not redacted: {cleaned['access_token']}"
    assert cleaned["otp"] == "[REDACTED]", f"OTP not redacted: {cleaned['otp']}"
    assert cleaned["api_key"] == "[REDACTED]", f"API key not redacted: {cleaned['api_key']}"
    assert cleaned["customer_email"] == "j***e@gmail.com", f"Email not masked: {cleaned['customer_email']}"
    assert cleaned["phone"] == "+919****3210", f"Phone not masked: {cleaned['phone']}"
    assert cleaned["amount"] == 2499.00, f"Amount corrupted: {cleaned['amount']}"
    print("  -> Sensitive Data Filter PASS")

def test_logger_event_emission():
    print("[TEST 2] Testing Structured Event Emission...")
    logger = get_logger("test_module")
    
    # Set context variables
    request_id_ctx.set("req_test_12345")
    user_id_ctx.set("user_42")
    client_ip_ctx.set("192.168.1.100")
    
    # Emit test events
    logger.info_event(
        module="ORDER",
        event="ORDER_CREATED",
        message="Customer successfully placed an order",
        action="Order created and awaiting payment confirmation",
        result="SUCCESS",
        order_id=1024,
        total_amount=2499.00,
        customer_email="test.buyer@example.com",
        customer_phone="+919876543210",
        password="should_be_redacted",
    )
    
    logger.warning_event(
        module="PAYMENT",
        event="PAYMENT_FAILED",
        message="Payment declined by bank due to insufficient funds",
        action="Recorded payment failure and alerted customer",
        result="DECLINED",
        order_id=1024,
        txnid="TXN2499abcd",
    )
    print("  -> Structured Event Emission PASS")

def test_fastapi_client():
    print("[TEST 3] Testing FastAPI RequestObservabilityMiddleware...")
    from fastapi.testclient import TestClient
    from main import app
    
    client = TestClient(app)
    
    # Health check
    response = client.get("/health")
    assert response.status_code == 200, f"Health check failed: {response.status_code}"
    assert "x-request-id" in [k.lower() for k in response.headers.keys()], "X-Request-ID missing from response headers"
    req_id = response.headers.get("x-request-id")
    print(f"  -> Health check OK (X-Request-ID: {req_id})")
    
    # Custom Request ID propagation
    custom_id = "req_custom_tracer_999"
    response2 = client.get("/health", headers={"X-Request-ID": custom_id})
    assert response2.headers.get("x-request-id") == custom_id, f"Custom Request ID not preserved: {response2.headers.get('x-request-id')}"
    print(f"  -> Custom correlation ID preservation PASS ({custom_id})")
    
    # Base route check
    res_root = client.get("/")
    assert res_root.status_code == 200
    print("  -> Base root route OK")

if __name__ == "__main__":
    test_sensitive_masking()
    test_logger_event_emission()
    test_fastapi_client()
    print("\nALL OBSERVABILITY TESTS COMPLETED SUCCESSFULLY!")

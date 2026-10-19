import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import UserDB, ProductDB, CartItemDB, BundleDB
from datetime import datetime, timedelta, timezone

client = TestClient(app)


def test_health_check_get_and_head():
    """Verify both GET and HEAD /health return 200 OK for uptime monitors."""
    res_get = client.get("/health")
    assert res_get.status_code == 200
    assert res_get.json() == {"status": "ok"}

    res_head = client.head("/health")
    assert res_head.status_code == 200


def test_root_get_and_head():
    """Verify both GET and HEAD / return 200 OK."""
    res_get = client.get("/")
    assert res_get.status_code == 200
    assert res_get.json()["status"] == "running"

    res_head = client.head("/")
    assert res_head.status_code == 200


def test_cron_keep_alive():
    """Verify /cron/keep-alive pings DB and returns 200 OK."""
    res_get = client.get("/cron/keep-alive")
    assert res_get.status_code == 200
    data = res_get.json()
    assert data["status"] == "ok"
    assert "connected" in data["database"]

    res_head = client.head("/cron/keep-alive")
    assert res_head.status_code == 200


def test_cron_abandoned_carts_auth():
    """Verify /cron/abandoned-carts enforces secret key protection."""
    # Missing secret key
    res_no_key = client.get("/cron/abandoned-carts")
    assert res_no_key.status_code == 401

    # Invalid secret key
    res_wrong_key = client.get("/cron/abandoned-carts?key=invalid_secret_key")
    assert res_wrong_key.status_code == 401

    # Valid secret key via query param
    res_valid_query = client.get("/cron/abandoned-carts?key=tronix365_cron_secret")
    assert res_valid_query.status_code == 200
    assert res_valid_query.json()["success"] is True

    # Valid secret key via Header
    res_valid_header = client.post(
        "/cron/abandoned-carts",
        headers={"X-Cron-Secret": "tronix365_cron_secret"}
    )
    assert res_valid_header.status_code == 200
    assert res_valid_header.json()["success"] is True


def test_cron_cleanup_stale_bundles():
    """Verify /cron/cleanup-stale-bundles sweeps invalid bundles from carts."""
    db = SessionLocal()
    try:
        # Create a user & product if needed
        user = db.query(UserDB).first()
        prod = db.query(ProductDB).first()
        if not user or not prod:
            pytest.skip("No user or product in database to test cart bundle cleanup.")

        # Create an expired bundle
        yesterday = datetime.now(timezone.utc) - timedelta(days=1)
        expired_bundle = BundleDB(
            name="Stale Cron Test Bundle",
            description="Testing cron cleanup",
            original_price=1000.0,
            bundle_price=800.0,
            expiry_date=yesterday,
            is_active=True,
        )
        db.add(expired_bundle)
        db.commit()
        db.refresh(expired_bundle)

        # Create a cart item with the expired bundle
        cart_item = CartItemDB(
            user_id=user.id,
            product_id=prod.id,
            bundle_id=expired_bundle.id,
            quantity=1,
            selected=True,
        )
        db.add(cart_item)
        db.commit()
        db.refresh(cart_item)
        assert cart_item.bundle_id == expired_bundle.id

        # Trigger cleanup endpoint
        res = client.get("/cron/cleanup-stale-bundles?key=tronix365_cron_secret")
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["unlinked_count"] >= 1

        # Check DB that the bundle_id is now unlinked (None)
        db.refresh(cart_item)
        assert cart_item.bundle_id is None

        # Clean up test bundle
        db.delete(cart_item)
        db.delete(expired_bundle)
        db.commit()
    finally:
        db.close()

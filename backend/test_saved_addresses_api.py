import os
import sys
from fastapi.testclient import TestClient
from dotenv import load_dotenv

load_dotenv()

from main import app, get_current_user
from database import SessionLocal
from models import UserDB, AddressDB

client = TestClient(app)

def test_addresses_lifecycle():
    db = SessionLocal()
    try:
        # 1. Get or create test user
        test_user = db.query(UserDB).filter(UserDB.email == "test_addr_user@tronix365.in").first()
        if not test_user:
            test_user = UserDB(
                email="test_addr_user@tronix365.in",
                hashed_password="fakehashedpassword",
                full_name="Rajesh Tester",
                role="user",
                is_active=True
            )
            db.add(test_user)
            db.commit()
            db.refresh(test_user)

        # Override dependency
        app.dependency_overrides[get_current_user] = lambda: test_user

        # Clear existing test addresses
        db.query(AddressDB).filter(AddressDB.user_id == test_user.id).delete()
        db.commit()

        # Test 1: Empty list initially
        res = client.get("/addresses")
        assert res.status_code == 200, res.text
        assert len(res.json()) == 0
        print("[PASS] Test 1: GET /addresses initially empty")

        # Test 2: Create first address (Home) - should automatically become default
        addr1_payload = {
            "label": "Home",
            "full_name": "Rajesh Tester",
            "phone": "9876543210",
            "address_line": "Flat 402, Sunshine Heights, FC Road",
            "landmark": "Near Goodluck Cafe",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411004",
            "is_default": False
        }
        res = client.post("/addresses", json=addr1_payload)
        assert res.status_code == 201, res.text
        addr1 = res.json()
        assert addr1["is_default"] == True  # First address auto-promoted to default
        assert addr1["label"] == "Home"
        print("[PASS] Test 2: POST /addresses created first address as default")

        # Test 3: Create second address (Factory/Office) with is_default=True
        addr2_payload = {
            "label": "Factory",
            "full_name": "Rajesh Electronics Ltd",
            "phone": "9876500000",
            "address_line": "Plot 42, Bhosari MIDC Phase 2",
            "city": "Pune",
            "state": "Maharashtra",
            "pincode": "411026",
            "is_default": True,
            "is_gst_invoice": True,
            "company_name": "Rajesh Electronics Pvt Ltd",
            "gstin": "27AAACR1234F1Z5"
        }
        res = client.post("/addresses", json=addr2_payload)
        assert res.status_code == 201, res.text
        addr2 = res.json()
        assert addr2["is_default"] == True
        print("[PASS] Test 3: POST /addresses created second address with GSTIN and set as default")

        # Verify previous address is no longer default
        res = client.get("/addresses")
        addrs = res.json()
        assert len(addrs) == 2
        assert addrs[0]["id"] == addr2["id"]  # Default address comes first
        assert addrs[0]["is_default"] == True
        assert addrs[1]["id"] == addr1["id"]
        assert addrs[1]["is_default"] == False
        print("[PASS] Test 4: GET /addresses orders default address first and resets other defaults")

        # Test 5: Switch default back to addr1
        res = client.put(f"/addresses/{addr1['id']}/set-default")
        assert res.status_code == 200, res.text
        assert res.json()["is_default"] == True
        print("[PASS] Test 5: PUT /addresses/{id}/set-default switched primary default")

        # Test 6: Update addr1 details
        res = client.put(f"/addresses/{addr1['id']}", json={"landmark": "Opposite Starbucks"})
        assert res.status_code == 200, res.text
        assert res.json()["landmark"] == "Opposite Starbucks"
        print("[PASS] Test 6: PUT /addresses/{id} updated landmark")

        # Test 7: Delete addr1
        res = client.delete(f"/addresses/{addr1['id']}")
        assert res.status_code == 200, res.text

        # Verify addr2 is now promoted to default because addr1 was deleted
        res = client.get("/addresses")
        remaining = res.json()
        assert len(remaining) == 1
        assert remaining[0]["id"] == addr2["id"]
        assert remaining[0]["is_default"] == True
        print("[PASS] Test 7: DELETE /addresses/{id} cleaned up and auto-promoted remaining to default")

        # Cleanup
        db.query(AddressDB).filter(AddressDB.user_id == test_user.id).delete()
        db.delete(test_user)
        db.commit()
        print("[SUCCESS] All Saved Address Backend Tests Passed Successfully!\n")

    finally:
        app.dependency_overrides.clear()
        db.close()

if __name__ == "__main__":
    test_addresses_lifecycle()

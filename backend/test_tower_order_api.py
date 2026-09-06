import unittest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import TowerOrderDB

class TestTowerOrderWorkflow(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.db = SessionLocal()

    def tearDown(self):
        self.db.close()

    def test_tower_order_crud_and_steps(self):
        from models import UserDB
        from auth import create_access_token
        test_user = self.db.query(UserDB).filter(UserDB.email == "buyer@industry.com").first()
        if not test_user:
            test_user = UserDB(
                email="buyer@industry.com",
                hashed_password="fakehashedpassword",
                full_name="Test Industrial Buyer",
                role="user",
                is_active=True
            )
            self.db.add(test_user)
            self.db.commit()
            self.db.refresh(test_user)
        token = create_access_token(data={"sub": test_user.email})
        headers = {"Authorization": f"Bearer {token}"}

        payload = {
            "product_name": "Industrial Microcontroller STM32",
            "customer_name": "Test Industrial Buyer",
            "customer_email": "buyer@industry.com",
            "customer_phone": "9876543210",
            "company_name": "Apex Robotics Ltd",
            "gstin": "27AAAAA0000A1Z5",
            "delivery_address": "Plot 42, MIDC Industrial Area",
            "delivery_city": "Pune",
            "delivery_state": "Maharashtra",
            "delivery_pincode": "411018",
            "requested_qty": 100,
            "immediate_qty": 10,
            "backorder_qty": 90,
            "target_price": 350.0,
            "customer_notes": "Urgent requirement for production batch",
            "required_by_date": "2026-10-15"
        }
        res = self.client.post("/tower-orders", json=payload, headers=headers)
        self.assertEqual(res.status_code, 201, f"Response: {res.text}")
        data = res.json()
        order_id = data["id"]
        order_number = data["order_number"]
        self.assertTrue(order_number.startswith("TO-"))
        self.assertEqual(data["status"], "requested")
        self.assertEqual(data["requested_qty"], 100)
        self.assertEqual(data["immediate_qty"], 10)
        self.assertEqual(data["backorder_qty"], 90)
        self.assertEqual(data["target_price"], 350.0)
        self.assertEqual(data["target_total"], 35000.0)

        res = self.client.get(f"/tower-orders/{order_number}")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["id"], order_id)

        pay_payload = {
            "payment_mode": "NEFT",
            "payment_ref_utr": "HDFCN26090400123",
            "payment_receipt_url": "https://example.com/receipt.pdf"
        }
        res = self.client.post(f"/tower-orders/{order_id}/payment-proof", json=pay_payload)
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["payment_status"], "submitted")
        self.assertEqual(res.json()["status"], "payment_pending")

        order_in_db = self.db.query(TowerOrderDB).filter(TowerOrderDB.id == order_id).first()
        if order_in_db:
            self.db.delete(order_in_db)
            self.db.commit()

if __name__ == "__main__":
    unittest.main()

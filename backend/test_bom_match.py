import pytest
from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from models import ProductDB

client = TestClient(app)


@pytest.fixture(scope="module")
def setup_test_products():
    db = SessionLocal()
    # Create test products for BOM matching
    p1 = ProductDB(
        title="ESP32 Development Board CP2102",
        description="Dual core 2.4GHz WiFi and Bluetooth NodeMCU-32S board",
        price=349.0,
        sale_price=320.0,
        stock=25,
        category="Development Boards",
        skv="ESP32-DEV-32S",
    )
    p2 = ProductDB(
        title="Arduino Uno R3 ATmega328P with USB Cable",
        description="Standard microcontroller board for robotics and automation",
        price=450.0,
        sale_price=420.0,
        stock=5,
        category="Development Boards",
        skv="ARD-UNO-R3",
    )
    p3 = ProductDB(
        title="HC-SR04 Ultrasonic Distance Sensor Module",
        description="Sonar range finder for obstacle detection 2cm - 400cm",
        price=99.0,
        sale_price=85.0,
        stock=0,  # Out of stock
        category="Sensors",
        skv="SN-HCSR04",
    )
    db.add_all([p1, p2, p3])
    db.commit()

    yield {
        "esp32_id": p1.id,
        "arduino_id": p2.id,
        "sensor_id": p3.id,
    }

    # Clean up test items
    db.query(ProductDB).filter(ProductDB.id.in_([p1.id, p2.id, p3.id])).delete(synchronize_session=False)
    db.commit()
    db.close()


def test_bom_match_exact_sku(setup_test_products):
    payload = {
        "items": [
            {"query": "ESP32-DEV-32S", "quantity": 3}
        ]
    }
    response = client.post("/bom/match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_requested"] == 1
    assert data["matched_count"] == 1
    assert data["unmatched_count"] == 0
    assert data["in_stock_count"] == 1

    item = data["results"][0]
    assert item["status"] == "exact_match"
    assert item["in_stock"] is True
    assert item["matched_product"]["sku"] == "ESP32-DEV-32S"
    assert item["matched_product"]["stock"] >= 3


def test_bom_match_fuzzy_title_and_out_of_stock(setup_test_products):
    payload = {
        "items": [
            {"query": "Arduino Uno", "quantity": 2},
            {"query": "HC-SR04 Ultrasonic", "quantity": 4},
            {"query": "Nonexistent Quantum Resonator XYZ999", "quantity": 1},
        ]
    }
    response = client.post("/bom/match", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["total_requested"] == 3
    assert data["matched_count"] == 2
    assert data["unmatched_count"] == 1

    # Check Arduino match (in stock)
    arduino = next(r for r in data["results"] if "Arduino" in r["original_query"])
    assert "Arduino" in arduino["matched_product"]["title"]
    assert arduino["in_stock"] is True

    # Check Ultrasonic sensor (out of stock)
    sensor = next(r for r in data["results"] if "HC-SR04" in r["original_query"])
    assert "HC-SR04" in sensor["matched_product"]["title"]
    assert sensor["status"] == "out_of_stock"
    assert sensor["in_stock"] is False

    # Check unmatched
    unmatched = next(r for r in data["results"] if "Nonexistent" in r["original_query"])
    assert unmatched["status"] == "not_found"
    assert unmatched["matched_product"] is None

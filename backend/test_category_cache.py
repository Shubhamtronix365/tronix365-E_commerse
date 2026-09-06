import pytest
from fastapi.testclient import TestClient
from main import app
from database import get_db, Base, engine
from models import UserDB
import auth

client = TestClient(app)

def test_get_categories_cached():
    """Verify GET /categories succeeds and can be called repeatedly."""
    res1 = client.get("/categories")
    assert res1.status_code == 200
    data1 = res1.json()
    assert isinstance(data1, list)

    res2 = client.get("/categories")
    assert res2.status_code == 200
    data2 = res2.json()
    assert len(data1) == len(data2)

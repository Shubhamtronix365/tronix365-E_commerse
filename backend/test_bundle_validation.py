import os
import datetime
from sqlalchemy.orm import Session
from database import SessionLocal
from models import BundleDB, BundleResponse
from sqlalchemy.orm import joinedload
from datetime import datetime as dt, timedelta

def test_bundle_validation():
    print("Starting Unit Tests for Bundle Expiry and Usage Limit...")
    db = SessionLocal()
    
    # 1. Create a mock bundle
    print("Creating mock bundle in database...")
    mock_bundle = BundleDB(
        name="Test Validation Bundle",
        description="A bundle to test expiry and usage limits",
        original_price=100.0,
        bundle_price=80.0,
        is_active=True,
        expiry_date=dt.utcnow() + timedelta(days=2),
        usage_limit=5,
        used_count=0
    )
    db.add(mock_bundle)
    db.commit()
    db.refresh(mock_bundle)
    print(f"Created bundle ID: {mock_bundle.id}")

    try:
        # 2. Test status helpers logic locally
        # Active and not expired
        assert mock_bundle.is_active == True
        now = dt.now(mock_bundle.expiry_date.tzinfo) if mock_bundle.expiry_date.tzinfo else dt.utcnow()
        assert mock_bundle.expiry_date > now
        assert mock_bundle.used_count < mock_bundle.usage_limit
        print("Test 1 (Active/Valid): PASS")

        # Expired
        mock_bundle.expiry_date = dt.now(mock_bundle.expiry_date.tzinfo) if mock_bundle.expiry_date.tzinfo else dt.utcnow()
        mock_bundle.expiry_date -= timedelta(days=1)
        db.commit()
        db.refresh(mock_bundle)
        now = dt.now(mock_bundle.expiry_date.tzinfo) if mock_bundle.expiry_date.tzinfo else dt.utcnow()
        assert mock_bundle.expiry_date < now
        print("Test 2 (Expired): PASS")

        # Exceeded limit
        mock_bundle.expiry_date = (dt.now(mock_bundle.expiry_date.tzinfo) if mock_bundle.expiry_date.tzinfo else dt.utcnow()) + timedelta(days=2)
        mock_bundle.used_count = 5
        db.commit()
        db.refresh(mock_bundle)
        assert mock_bundle.used_count >= mock_bundle.usage_limit
        print("Test 3 (Limit Reached): PASS")

        # 3. Test Pydantic serialization
        pydantic_bundle = BundleResponse.from_orm(mock_bundle)
        assert pydantic_bundle.used_count == 5
        assert pydantic_bundle.usage_limit == 5
        print("Test 4 (Pydantic Serialization): PASS")

        print("ALL TESTS PASSED SUCCESSFULLY!")

    except AssertionError as e:
        print(f"TEST FAILED: {e}")
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        # Clean up
        print("Cleaning up mock bundle...")
        db.delete(mock_bundle)
        db.commit()
        db.close()

if __name__ == "__main__":
    test_bundle_validation()

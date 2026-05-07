from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import UserDB
from auth import get_password_hash
import os


def create_admin():
    db = SessionLocal()
    try:
        # Check for existing admin
        email = os.getenv("ADMIN_EMAIL", "bhavesh729@gmail.com")
        password = os.getenv("ADMIN_PASSWORD", "bhavesh729")
        hashed_password = get_password_hash(password)

        admin = db.query(UserDB).filter(UserDB.email == email).first()
        if admin:
            print(f"Admin '{email}' already exists. Updating password...")
            admin.hashed_password = hashed_password
            admin.role = "admin"
            db.commit()
            print(f"Admin password updated successfully!")
            return

        print(f"Creating new admin: {email}")

        new_admin = UserDB(
            email=email,
            hashed_password=hashed_password,
            full_name="System Admin",
            role="admin",
            is_active=True,
        )

        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Admin created successfully!")
        print(f"Email: {email}")
        print(f"Password: {password}")

    except Exception as e:
        print(f"Error creating admin: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()

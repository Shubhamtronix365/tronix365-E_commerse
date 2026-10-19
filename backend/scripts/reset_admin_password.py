"""
Script to verify and reset admin password for Tronix365 platform.
Usage:
    python scripts/reset_admin_password.py --password "YourAdminPassword"
    python scripts/reset_admin_password.py --email admin@tronix365.in --password "YourAdminPassword"
"""

import os
import sys
import argparse

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"))

from database import SessionLocal
from models import UserDB
from auth import get_password_hash, verify_password


def ensure_admin_password(target_email="admin@tronix365.in", target_password=None):
    if not target_password:
        target_password = os.getenv("ADMIN_PASSWORD")
    if not target_password:
        print("[ERROR] Please specify a password via --password or set ADMIN_PASSWORD in environment.")
        sys.exit(1)
    email = target_email.lower().strip()
    db = SessionLocal()
    try:
        user = db.query(UserDB).filter(UserDB.email == email).first()
        if not user:
            print(f"Creating new admin account for '{email}'...")
            user = UserDB(
                email=email,
                full_name="System Administrator",
                hashed_password=get_password_hash(target_password),
                role="admin",
                is_active=True
            )
            db.add(user)
            db.commit()
            print(f"[SUCCESS] Created admin account '{email}' with password '{target_password}'.")
            return

        # Check existing password
        if verify_password(target_password, user.hashed_password):
            print(f"[STATUS] Password for '{email}' is ALREADY set to '{target_password}'.")
            print(f"         Role: {user.role} | Active: {user.is_active} | No modification needed.")
            if user.role != "admin" or not user.is_active:
                user.role = "admin"
                user.is_active = True
                db.commit()
                print("         Ensured role is 'admin' and account is active.")
            return

        # Reset password if changed or drifted
        print(f"Password for '{email}' differs. Resetting to '{target_password}'...")
        user.hashed_password = get_password_hash(target_password)
        user.role = "admin"
        user.is_active = True
        user.otp_blocked_until = None
        db.commit()
        print(f"[SUCCESS] Re-changed password for '{email}' to '{target_password}'.")
    except Exception as e:
        print(f"[ERROR] Error updating admin password: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify and reset Tronix365 admin password")
    parser.add_argument("--email", default="admin@tronix365.in", help="Admin email address")
    parser.add_argument("--password", default=os.getenv("ADMIN_PASSWORD"), help="Target admin password (or ADMIN_PASSWORD env var)")
    args = parser.parse_args()

    ensure_admin_password(args.email, args.password)

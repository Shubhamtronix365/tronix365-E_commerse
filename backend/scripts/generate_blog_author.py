import os
import sys
import argparse
import secrets
import string
from pathlib import Path

# Add parent directory to sys.path so we can import models and database
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from database import SessionLocal, engine, Base
from models import UserDB
from auth import get_password_hash


def generate_secure_password(length: int = 16) -> str:
    """Generate a high-entropy, secure password containing letters, numbers, and symbols."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
    while True:
        password = ''.join(secrets.choice(alphabet) for _ in range(length))
        # Ensure it contains at least one lower, upper, digit, and symbol
        if (any(c.islower() for c in password)
                and any(c.isupper() for c in password)
                and any(c.isdigit() for c in password)
                and any(c in "!@#$%^&*()-_=+" for c in password)):
            return password


def generate_author_credentials(author_id: str = None, password: str = None, name: str = None):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Default or generated values
        if not author_id:
            random_suffix = secrets.token_hex(2)
            author_id = f"author_{random_suffix}@tronix365.in"
        else:
            author_id = author_id.strip().lower()

        if not password:
            password = generate_secure_password(16)
        else:
            password = password.strip()

        if not name:
            name = "Tronix365 Technical Writer"

        hashed = get_password_hash(password)

        user = db.query(UserDB).filter(UserDB.email == author_id).first()
        if user:
            user.hashed_password = hashed
            user.role = "blog_author"
            user.is_active = True
            if name:
                user.full_name = name
            action = "UPDATED EXISTING AUTHOR"
        else:
            user = UserDB(
                email=author_id,
                hashed_password=hashed,
                full_name=name,
                role="blog_author",
                is_active=True,
            )
            db.add(user)
            action = "CREATED NEW AUTHOR"

        db.commit()
        db.refresh(user)

        print("\n" + "=" * 64)
        print(f"  [+] TRONIX365 BLOG AUTHOR CREDENTIALS ({action})")
        print("=" * 64)
        print(f"  Author ID / Email : {author_id}")
        print(f"  System Password   : {password}")
        print(f"  Display Name      : {user.full_name}")
        print(f"  Assigned Role     : {user.role}")
        print(f"  Access Portal     : /blogs (Click 'Author Studio') or /blog-studio")
        print("=" * 64)
        print("  NOTE: Keep these credentials safe. They grant full publishing")
        print("  and editing access to the Tronix365 Blog Studio Dashboard.")
        print("=" * 64 + "\n")

        return {
            "author_id": author_id,
            "password": password,
            "name": user.full_name,
            "role": user.role,
        }
    finally:
        db.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate secure Blog Author credentials for Tronix365")
    parser.add_argument("--id", type=str, default=None, help="Custom Author ID / Email")
    parser.add_argument("--password", type=str, default=None, help="Custom password (optional)")
    parser.add_argument("--name", type=str, default=None, help="Author display name")
    args = parser.parse_args()

    generate_author_credentials(author_id=args.id, password=args.password, name=args.name)

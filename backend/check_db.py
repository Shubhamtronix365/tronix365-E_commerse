import os
import sys

from database import SessionLocal
from models import OrderDB, UserDB


def check_db():
    db = SessionLocal()
    try:
        orders = db.query(OrderDB).order_by(OrderDB.id.desc()).limit(3).all()
        users = db.query(UserDB).order_by(UserDB.id.desc()).limit(3).all()

        print("--- RECENT ORDERS ---")
        for o in orders:
            print(f"Order {o.id}:")
            print(f"  customer_email : '{o.customer_email}'")
            print(f"  full_name      : '{o.full_name}'")
            print(f"  status         : '{o.status}'")
            print(f"  total_amount   : {o.total_amount}")

        print("\n--- RECENT USERS ---")
        for u in users:
            print(f"User {u.id}:")
            print(f"  email     : '{u.email}'")
            print(f"  full_name : '{u.full_name}'")
            print(f"  role      : '{u.role}'")

    finally:
        db.close()


if __name__ == "__main__":
    check_db()

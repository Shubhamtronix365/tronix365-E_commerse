from sqlalchemy import text
from database import engine


def fix_sequence():
    print("Fixing PostgreSQL sequence for products table...")
    with engine.connect() as conn:
        try:
            # Check if using PostgreSQL
            if engine.dialect.name != "postgresql":
                print("Not using PostgreSQL, skipping sequence fix.")
                return

            # Reset sequence to max(id)
            sql = text(
                "SELECT setval('products_id_seq', (SELECT MAX(id) FROM products));"
            )
            result = conn.execute(sql)
            conn.commit()
            print(f"Sequence reset result: {result.fetchone()}")
            print("Sequence fixed successfully.")
        except Exception as e:
            print(f"Error fixing sequence: {e}")


if __name__ == "__main__":
    fix_sequence()

from database import engine
from sqlalchemy import text


def run_migration():
    queries = [
        "ALTER TABLE orders ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();",
        "ALTER TABLE orders ADD COLUMN txnid VARCHAR;",
        "ALTER TABLE orders ADD COLUMN full_name VARCHAR;",
        "ALTER TABLE orders ADD COLUMN phone VARCHAR;",
        "ALTER TABLE orders ADD COLUMN address_line VARCHAR;",
        "ALTER TABLE orders ADD COLUMN city VARCHAR;",
        "ALTER TABLE orders ADD COLUMN state VARCHAR;",
        "ALTER TABLE orders ADD COLUMN pincode VARCHAR;",
    ]

    with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        for q in queries:
            try:
                conn.execute(text(q))
                print(f"Success: {q.split(' ')[4]}")
            except Exception as e:
                print(f"Skipped {q.split(' ')[4]}: {e}")

    print("Migration complete!")


if __name__ == "__main__":
    run_migration()

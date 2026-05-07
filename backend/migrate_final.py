from database import engine
from sqlalchemy import text


def migrate():
    with engine.begin() as conn:
        print("Final check for cart_items columns...")

        # Add bundle_id if missing
        try:
            conn.execute(
                text(
                    "ALTER TABLE cart_items ADD COLUMN bundle_id INTEGER REFERENCES bundles(id)"
                )
            )
            print("Added column 'bundle_id'.")
        except:
            print("Column 'bundle_id' already exists or other error.")

        # Add updated_at if missing
        try:
            conn.execute(
                text(
                    "ALTER TABLE cart_items ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP"
                )
            )
            print("Added column 'updated_at'.")
        except:
            print("Column 'updated_at' already exists or other error.")

        print("Done.")


if __name__ == "__main__":
    migrate()

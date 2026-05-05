from database import engine
from sqlalchemy import text

def migrate():
    with engine.begin() as conn:
        print("Starting cart_items migrations (with engine.begin)...")
        
        # Add columns to cart_items table
        columns_cart = [
            ("bundle_id", "INTEGER REFERENCES bundles(id)"),
            ("updated_at", "TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP")
        ]
        
        for col_name, col_type in columns_cart:
            try:
                conn.execute(text(f"ALTER TABLE cart_items ADD COLUMN {col_name} {col_type}"))
                print(f"Added column '{col_name}' to 'cart_items' table.")
            except Exception as e:
                print(f"Column '{col_name}' in 'cart_items' may already exist or error: {e}")

        print("Migrations completed.")

if __name__ == "__main__":
    migrate()

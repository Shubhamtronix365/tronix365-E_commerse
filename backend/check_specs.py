from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)

with engine.connect() as connection:
    try:
        # Check for products with NULL specs
        result = connection.execute(
            text("SELECT id, title, specs FROM products WHERE specs IS NULL")
        )
        null_specs = result.fetchall()

        print(f"Products with NULL specs: {len(null_specs)}")
        for row in null_specs:
            print(row)

        # Also check for empty specs just in case
        # Note: JSON null vs SQL NULL might differ
    except Exception as e:
        print(f"Error querying products: {e}")

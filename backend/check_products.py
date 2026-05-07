from sqlalchemy import create_engine, text
import os
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("DATABASE_URL")
engine = create_engine(database_url)

with engine.connect() as connection:
    try:
        result = connection.execute(text("SELECT count(*) FROM products"))
        count = result.scalar()
        print(f"Product count: {count}")

        if count > 0:
            result = connection.execute(
                text("SELECT id, title, price FROM products LIMIT 5")
            )
            print("Sample products:")
            for row in result:
                print(row)
    except Exception as e:
        print(f"Error querying products: {e}")

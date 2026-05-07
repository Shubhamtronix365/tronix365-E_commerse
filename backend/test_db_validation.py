import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv("DATABASE_URL")
if database_url and database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

try:
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    from models import ProductDB, Product

    products = session.query(ProductDB).all()
    print(f"Found {len(products)} products in DB.")

    for p in products:
        print(f"Product {p.id} specs type: {type(p.specs)}")
        # Try to validate with Pydantic
        try:
            Product.from_orm(p)
            print(f"Product {p.id} validated successfully.")
        except Exception as e:
            print(f"Pydantic Validation Error on Product {p.id}: {e}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if "session" in locals():
        session.close()

import os
import json
import sys
from sqlalchemy.orm import Session
from dotenv import load_dotenv

# Ensure console output handles UTF-8 characters nicely on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from database import SessionLocal
from models import ProductDB

# Load .env
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=dotenv_path)

def main():
    db: Session = SessionLocal()
    try:
        products = db.query(ProductDB).all()
        data = []
        for p in products:
            data.append({
                "id": p.id,
                "title": p.title,
                "category": p.category,
                "specs": p.specs or {}
            })
            
        output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "products_to_desc.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully dumped {len(data)} products to {output_path}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()

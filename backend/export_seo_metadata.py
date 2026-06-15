import os
import json
import sys
import re
from sqlalchemy import create_engine
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

def make_slug(title: str) -> str:
    if not title:
        return ""
    t = title.lower()
    t = re.sub(r'[^a-z0-9\s-]', '', t)
    t = re.sub(r'[\s-]+', '-', t)
    return t.strip('-')

def main():
    db: Session = SessionLocal()
    try:
        products = db.query(ProductDB).all()
        data = []
        for p in products:
            slug = make_slug(p.title)
            data.append({
                "id": p.id,
                "slug": slug,
                "title": p.title,
                "description": p.description or "",
                "price": p.price or 0.0,
                "category": p.category or "",
                "image": p.image or "",
                "skv": p.skv or "",
                "stock": p.stock if p.stock is not None else 0
            })
            
        # Write to public/products_metadata.json
        output_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public", "products_metadata.json")
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            
        print(f"Successfully exported {len(data)} products to {output_path}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()

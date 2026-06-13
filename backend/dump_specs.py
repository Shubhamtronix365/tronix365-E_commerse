import sys
from database import SessionLocal
from models import ProductDB

sys.stdout.reconfigure(encoding='utf-8')

db = SessionLocal()
try:
    products = db.query(ProductDB).all()
    empty_desc = 0
    non_empty = 0
    sample_empty = []
    sample_non_empty = []
    
    for p in products:
        desc = (p.description or "").strip()
        if not desc or len(desc) < 10:
            empty_desc += 1
            if len(sample_empty) < 10:
                sample_empty.append((p.id, p.title, p.category, p.description))
        else:
            non_empty += 1
            if len(sample_non_empty) < 10:
                sample_non_empty.append((p.id, p.title, p.category, p.description[:100] + "..."))
                
    print(f"Products with empty or short description (< 10 chars): {empty_desc}")
    print("Sample empty description products:")
    for row in sample_empty:
        print(row)
        
    print(f"\nProducts with description: {non_empty}")
    print("Sample non-empty description products:")
    for row in sample_non_empty:
        print(row)
        
finally:
    db.close()

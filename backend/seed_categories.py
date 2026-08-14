from database import SessionLocal
from models import CategoryDB, ProductDB

def seed_categories():
    db = SessionLocal()
    try:
        # Check existing categories
        existing_cats = {c.name.strip().lower() for c in db.query(CategoryDB).all()}

        # Default icon and color palette mappings
        cat_configs = {
            "development boards": ("CircuitBoard", "from-violet-500 to-fuchsia-500", 1),
            "sensors": ("Wifi", "from-cyan-500 to-blue-500", 2),
            "modules": ("Cpu", "from-purple-500 to-pink-500", 3),
            "motors": ("Zap", "from-amber-500 to-orange-500", 4),
            "battery": ("Battery", "from-emerald-500 to-teal-500", 5),
            "displays": ("Monitor", "from-indigo-500 to-violet-500", 6),
            "relays": ("ToggleLeft", "from-rose-500 to-red-500", 7),
            "led": ("Sun", "from-yellow-400 to-amber-500", 8),
            "miscellaneous": ("Package", "from-slate-400 to-slate-600", 9),
            "other": ("MoreHorizontal", "from-rose-500 to-pink-600", 10),
        }

        # Find distinct categories from products table
        raw_cats = db.query(ProductDB.category).distinct().all()
        distinct_names = [r[0] for r in raw_cats if r[0] and r[0].strip()]

        added_count = 0
        for idx, cat_name in enumerate(distinct_names, start=1):
            clean_name = cat_name.strip()
            key = clean_name.lower()
            if key not in existing_cats:
                icon, color, sort_order = cat_configs.get(
                    key, ("Package", "from-slate-400 to-slate-600", 10 + idx)
                )
                db_cat = CategoryDB(
                    name=clean_name,
                    icon=icon,
                    color=color,
                    sort_order=sort_order,
                    is_active=True
                )
                db.add(db_cat)
                existing_cats.add(key)
                added_count += 1

        db.commit()
        print(f"Successfully seeded {added_count} categories into CategoryDB!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding categories: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_categories()

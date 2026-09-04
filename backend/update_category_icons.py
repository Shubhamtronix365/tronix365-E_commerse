import os
from dotenv import load_dotenv

load_dotenv()

from database import SessionLocal
from models import CategoryDB

UPDATES = {
    "wheels": {"icon": "Disc", "color": "from-amber-500 to-yellow-500"},
    "socket": {"icon": "Plug", "color": "from-blue-500 to-indigo-500"},
    "miscellaneous": {"icon": "Shapes", "color": "from-fuchsia-500 to-purple-600"},
    "module": {"icon": "Cpu", "color": "from-purple-500 to-pink-500"},
    "modules": {"icon": "Cpu", "color": "from-purple-500 to-pink-500"},
    "connector": {"icon": "Cable", "color": "from-cyan-500 to-teal-500"},
    "keypad": {"icon": "Keyboard", "color": "from-emerald-500 to-teal-600"},
    "switches": {"icon": "ToggleLeft", "color": "from-rose-500 to-red-500"},
    "cables": {"icon": "Cable", "color": "from-indigo-500 to-blue-600"},
    "other": {"icon": "MoreHorizontal", "color": "from-rose-500 to-pink-600"},
    "relays": {"icon": "ToggleLeft", "color": "from-red-500 to-rose-600"},
    "led": {"icon": "Sun", "color": "from-yellow-400 to-amber-500"},
}

def update_categories():
    db = SessionLocal()
    try:
        cats = db.query(CategoryDB).all()
        print(f"Checking {len(cats)} categories...")
        updated_count = 0
        for c in cats:
            key = c.name.lower().strip()
            if key in UPDATES:
                info = UPDATES[key]
                print(f"Updating '{c.name}': icon '{c.icon}' -> '{info['icon']}', color '{c.color}' -> '{info['color']}'")
                c.icon = info["icon"]
                c.color = info["color"]
                updated_count += 1
        
        db.commit()
        print(f"\n[SUCCESS] Successfully updated {updated_count} categories in database!")
    finally:
        db.close()

if __name__ == "__main__":
    update_categories()

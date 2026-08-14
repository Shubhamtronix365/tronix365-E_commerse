import os
import re
import sys
import json
from collections import defaultdict
from database import SessionLocal
from models import ProductDB

sys.stdout.reconfigure(encoding='utf-8')

def analyze_variant_clusters():
    db = SessionLocal()
    try:
        products = db.query(ProductDB).all()
        print(f"Total products in DB: {len(products)}")

        # Clusters dictionary: cluster_name -> list of product dicts
        clusters = defaultdict(list)
        unclustered = []

        for p in products:
            title = p.title.strip()
            title_upper = title.upper()
            
            # 1. Relimate Connectors
            if "RELIMATE" in title_upper:
                clusters["Relimate Connectors"].append(p)
                continue

            # 2. Capacitors
            if ("CAP" in title_upper or "UF" in title_upper or "PF" in title_upper) and "DECODER" not in title_upper and "KEYPAD" not in title_upper and "ANTENNA" not in title_upper and "LIMIT" not in title_upper:
                if re.search(r'\b(\d+(?:\.\d+)?)\s*(UF|PF|NF|CAPACOTIOR)\b', title, re.IGNORECASE) or re.search(r'CAP\b', title, re.IGNORECASE):
                    clusters["Ceramic & Electrolytic Capacitors"].append(p)
                    continue

            # 3. DC Motors (RPM Speed Variants)
            if "RPM" in title_upper or ("DC MOTOR" in title_upper and "WHEEL" not in title_upper and "DRIVER" not in title_upper):
                clusters["DC Geared Motors (RPM Variants)"].append(p)
                continue

            # 4. Battery Holders
            if "BATTERY HOLDER" in title_upper or "CELL BATTERY" in title_upper or "CELL-BATTERY" in title_upper:
                clusters["Battery Holders"].append(p)
                continue

            # 5. Servo Motors
            if "SERVO" in title_upper and "DRIVER" not in title_upper:
                clusters["Servo Motors"].append(p)
                continue

            # 6. Relay Modules
            if "RELAY" in title_upper and "QUBE" not in title_upper:
                clusters["Relay Modules (Channel Count Variants)"].append(p)
                continue

            # 7. Arduino Boards
            if "ARDUINO" in title_upper and "CABLE" not in title_upper and "SENSOR" not in title_upper and "KIT" not in title_upper:
                clusters["Arduino Boards"].append(p)
                continue

            unclustered.append(p)

        # Print summary report
        print("\n" + "="*80)
        print("VARIANT CLUSTERS IDENTIFIED IN DATABASE")
        print("="*80)

        cluster_summary = []
        for name, item_list in sorted(clusters.items(), key=lambda x: len(x[1]), reverse=True):
            print(f"\n[CLUSTER] {name} — ({len(item_list)} products)")
            items_info = []
            for p in item_list:
                print(f"   • ID {p.id:3d} | Price: ₹{p.price:6.2f} | Stock: {p.stock:3d} | Title: {p.title}")
                items_info.append({
                    "id": p.id,
                    "title": p.title,
                    "price": p.price,
                    "stock": p.stock,
                    "skv": p.skv,
                    "category": p.category
                })
            cluster_summary.append({
                "cluster_name": name,
                "count": len(item_list),
                "products": items_info
            })

        print("\n" + "="*80)
        print(f"Total Clustered Products: {sum(len(v) for v in clusters.values())}")
        print(f"Total Standalone/Unclustered Products: {len(unclustered)}")
        print("="*80)

        # Save JSON analysis
        with open("variant_clusters_analysis.json", "w", encoding="utf-8") as f:
            json.dump(cluster_summary, f, indent=2)
            print("\nDetailed cluster breakdown saved to variant_clusters_analysis.json")

    finally:
        db.close()

if __name__ == "__main__":
    analyze_variant_clusters()

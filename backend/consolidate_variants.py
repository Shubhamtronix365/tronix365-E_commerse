import os
from sqlalchemy import text
from database import SessionLocal, engine
from models import ProductDB

def migrate_and_consolidate_variants():
    db = SessionLocal()
    try:
        print("Checking database columns for variants support...")
        # Add parent_id, variant_name, variant_type columns if they don't exist
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES products(id);"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_name VARCHAR;"))
            conn.execute(text("ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_type VARCHAR;"))
            conn.commit()
            print("Database schema migration successful!")

        # ---------------------------------------------------------------------
        # CLUSTER 1: Relimate Connectors (Parent: ID 118)
        # ---------------------------------------------------------------------
        print("\nConsolidating Cluster 1: Relimate Connectors...")
        relimate_map = {
            118: ("2 PIN", "Pin Count"),
            119: ("3 PIN", "Pin Count"),
            120: ("4 PIN", "Pin Count"),
            121: ("5 PIN", "Pin Count"),
            122: ("6 PIN", "Pin Count"),
            123: ("7 PIN", "Pin Count"),
            124: ("8 PIN", "Pin Count"),
            125: ("12 PIN", "Pin Count"),
            126: ("16 PIN", "Pin Count")
        }
        parent_118 = db.query(ProductDB).filter(ProductDB.id == 118).first()
        if parent_118:
            parent_118.title = "Relimate Wire Connector Cable Set (2P to 16P)"
        
        for pid, (vname, vtype) in relimate_map.items():
            p = db.query(ProductDB).filter(ProductDB.id == pid).first()
            if p:
                p.parent_id = 118
                p.variant_name = vname
                p.variant_type = vtype

        # ---------------------------------------------------------------------
        # CLUSTER 2: Capacitors (Parent: ID 176)
        # ---------------------------------------------------------------------
        print("Consolidating Cluster 2: Multi-Value Capacitors...")
        cap_map = {
            179: ("22 pF", "Capacitance"),
            173: ("33 pF", "Capacitance"),
            177: ("100 pF", "Capacitance"),
            174: ("0.001 uF", "Capacitance"),
            175: ("0.01 uF", "Capacitance"),
            176: ("0.1 uF", "Capacitance"),
            180: ("1 uF", "Capacitance"),
            181: ("2.2 uF", "Capacitance"),
            182: ("4.7 uF", "Capacitance"),
            184: ("22 uF", "Capacitance"),
            185: ("100 uF", "Capacitance"),
            186: ("470 uF", "Capacitance"),
            187: ("1000 uF", "Capacitance")
        }
        parent_176 = db.query(ProductDB).filter(ProductDB.id == 176).first()
        if parent_176:
            parent_176.title = "Ceramic & Electrolytic Capacitors (Multi-Value)"

        for pid, (vname, vtype) in cap_map.items():
            p = db.query(ProductDB).filter(ProductDB.id == pid).first()
            if p:
                p.parent_id = 176
                p.variant_name = vname
                p.variant_type = vtype

        # ---------------------------------------------------------------------
        # CLUSTER 3: DC Geared Motors (Parent: ID 130)
        # ---------------------------------------------------------------------
        print("Consolidating Cluster 3: DC Geared Motors...")
        motor_map = {
            127: ("3.5 RPM", "Speed (RPM)"),
            129: ("10 RPM", "Speed (RPM)"),
            130: ("30 RPM", "Speed (RPM)"),
            131: ("60 RPM", "Speed (RPM)"),
            132: ("100 RPM", "Speed (RPM)"),
            136: ("200 RPM", "Speed (RPM)"),
            137: ("500 RPM", "Speed (RPM)")
        }
        parent_130 = db.query(ProductDB).filter(ProductDB.id == 130).first()
        if parent_130:
            parent_130.title = "12V Centre Shaft DC Geared Motor"

        for pid, (vname, vtype) in motor_map.items():
            p = db.query(ProductDB).filter(ProductDB.id == pid).first()
            if p:
                p.parent_id = 130
                p.variant_name = vname
                p.variant_type = vtype

        # ---------------------------------------------------------------------
        # CLUSTER 4: 18650 Battery Holders (Parent: ID 170)
        # ---------------------------------------------------------------------
        print("Consolidating Cluster 4: 18650 Battery Holders...")
        battery_map = {
            170: ("1-Cell", "Slot Count"),
            169: ("2-Cell", "Slot Count"),
            168: ("3-Cell", "Slot Count")
        }
        parent_170 = db.query(ProductDB).filter(ProductDB.id == 170).first()
        if parent_170:
            parent_170.title = "18650 Lithium Battery Holder Storage Case"

        for pid, (vname, vtype) in battery_map.items():
            p = db.query(ProductDB).filter(ProductDB.id == pid).first()
            if p:
                p.parent_id = 170
                p.variant_name = vname
                p.variant_type = vtype

        # ---------------------------------------------------------------------
        # CLUSTER 5: Relay Modules (Parent: ID 61)
        # ---------------------------------------------------------------------
        print("Consolidating Cluster 5: Relay Modules...")
        relay_map = {
            61: ("1 Channel", "Channels"),
            64: ("2 Channel", "Channels"),
            65: ("4 Channel", "Channels"),
            66: ("8 Channel", "Channels")
        }
        parent_61 = db.query(ProductDB).filter(ProductDB.id == 61).first()
        if parent_61:
            parent_61.title = "5V Optocoupler Relay Control Board Module"

        for pid, (vname, vtype) in relay_map.items():
            p = db.query(ProductDB).filter(ProductDB.id == pid).first()
            if p:
                p.parent_id = 61
                p.variant_name = vname
                p.variant_type = vtype

        db.commit()
        print("\nSUCCESS: All 5 product variant clusters have been linked in the database!")

    except Exception as e:
        db.rollback()
        print(f"Error consolidating variants: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_and_consolidate_variants()

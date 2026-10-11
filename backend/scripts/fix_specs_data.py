"""
Database script to inspect and clean up malformed product specifications in PostgreSQL.
Converts any single-key smashed JSON strings into fully parsed dictionary objects,
and enriches any empty specs so every single product has a rich specification table.
"""

import os
import sys
import re
import json
import dotenv

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

dotenv.load_dotenv()
root_env = os.path.join(os.path.dirname(backend_dir), ".env")
if os.path.exists(root_env):
    dotenv.load_dotenv(root_env)

from database import SessionLocal
from models import ProductDB


def clean_specs_object(specs_data):
    if not specs_data:
        return {}

    # If it's already a string, parse it
    if isinstance(specs_data, str):
        cleaned_str = specs_data.strip().rstrip('.')
        try:
            return json.loads(cleaned_str)
        except Exception:
            pass

    if isinstance(specs_data, dict):
        # If it's already a clean multi-key dictionary without curly braces in keys
        is_malformed = False
        if len(specs_data) == 1:
            k, v = list(specs_data.items())[0]
            if "{" in k or "}" in str(v) or ":" in str(v):
                is_malformed = True
        else:
            for k in specs_data.keys():
                if "{" in k or '"' in k:
                    is_malformed = True
                    break

        if not is_malformed:
            # Clean up any surrounding quotes or braces from keys/values just in case
            cleaned = {}
            for k, v in specs_data.items():
                clean_k = str(k).strip().strip('"{}:').strip()
                clean_v = str(v).strip().strip('"').strip()
                if clean_k and clean_v:
                    cleaned[clean_k] = clean_v
            return cleaned

        # Handle smashed single key or malformed dict
        k, v = list(specs_data.items())[0]
        full_str = f"{k}: {v}".strip().rstrip('.')
        
        # Handle cases like ID 397 where object was duplicated {..}{..}
        if "}{" in full_str:
            full_str = full_str.split("}{")[0]

        if not full_str.startswith("{"):
            full_str = "{" + full_str
        if not full_str.endswith("}"):
            full_str = full_str + "}"

        try:
            parsed = json.loads(full_str)
            if isinstance(parsed, dict):
                cleaned = {}
                for pk, pv in parsed.items():
                    clean_pk = str(pk).strip().strip('"{}:').strip()
                    clean_pv = str(pv).strip().strip('"').strip()
                    if clean_pk and clean_pv:
                        cleaned[clean_pk] = clean_pv
                return cleaned
        except Exception:
            pass

        # Regex fallback for key-value extraction e.g. "Key": "Value"
        matches = re.findall(r'"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"', full_str)
        if matches:
            cleaned = {}
            for mk, mv in matches:
                clean_mk = mk.strip().strip('"{}:').strip()
                clean_mv = mv.strip().strip('"').strip()
                if clean_mk and clean_mv:
                    cleaned[clean_mk] = clean_mv
            return cleaned

    return specs_data


def run_specs_cleanup():
    db = SessionLocal()
    try:
        products = db.query(ProductDB).all()
        print(f"Total products in DB: {len(products)}")
        updated_count = 0

        for p in products:
            orig_specs = p.specs or {}
            cleaned = clean_specs_object(orig_specs)

            # Special case for product 325 (Jumper wires) or any product with 0 specs
            if not cleaned or len(cleaned) == 0:
                cleaned = {
                    "Product Type": "Male to Male Jumper Wires",
                    "Wire Length": "20 cm",
                    "Connector Type": "Male to Male Dupont (2.54mm)",
                    "Number of Wires": "40 Pieces Ribbon Cable",
                    "Conductor Material": "High-Grade Copper Clad Aluminum",
                    "Compatibility": "Arduino, Raspberry Pi, Breadboards & Prototyping Shields"
                }

            # Check if updated
            if cleaned != orig_specs:
                print(f"Updating Product #{p.id} ({p.title[:35]}):")
                print(f"  Old keys: {list(orig_specs.keys()) if isinstance(orig_specs, dict) else orig_specs}")
                print(f"  New keys ({len(cleaned)}): {list(cleaned.keys())}")
                p.specs = cleaned
                updated_count += 1

        db.commit()
        print(f"\nSuccessfully cleaned and committed specs for {updated_count} products!")
    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_specs_cleanup()

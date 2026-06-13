import os
import sys
import argparse
import json
import re
import time
import random
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Add current folder to path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Ensure console output handles UTF-8 characters nicely on Windows
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except AttributeError:
    pass

from database import SessionLocal
from models import ProductDB

# Load .env file relative to this script
dotenv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
load_dotenv(dotenv_path=dotenv_path)

def generate_local_description(product: ProductDB) -> str:
    """
    Fallback method to generate a detailed description locally by extracting
    features (voltage, size, channels, chipsets) from the product title.
    """
    title = product.title
    category = product.category or "Electronics"
    
    # Extract operational voltage (e.g. 5V, 3.3V, 12V)
    voltage_match = re.search(r'(\d+(?:\.\d+)?)\s*[Vv]\b', title)
    
    # Extract dimensions/size (e.g. 5mm, 10cm, 0.96 inch, 2.4")
    size_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:mm|cm|inch|")\b', title, re.IGNORECASE)
    
    # Extract number of channels (e.g. 1 ch, 4 channel, 8 ch)
    channel_match = re.search(r'(\d+)\s*(?:-[Cc]hannel|[Cc]hannel|[Cc]hanel|[Cc]h)\b', title, re.IGNORECASE)
    
    # Extract known chipsets or boards
    chips = [
        "ESP32", "ESP8266", "L293D", "LM35", "DHT11", "DHT22", "TP4056", 
        "MAX7219", "MPU6050", "NE555", "HC-SR04", "HC-05", "HC-06", 
        "nRF24L01", "ATTiny85", "ATmega328P"
    ]
    chip_found = None
    for chip in chips:
        if re.search(rf'\b{chip}\b', title, re.IGNORECASE):
            chip_found = chip
            break
            
    # Construct technical segments
    voltage_str = f"operating at a stable {voltage_match.group(0)}" if voltage_match else "with standard operating voltage"
    size_str = f"measuring {size_match.group(0)}" if size_match else ""
    channel_str = f"featuring {channel_match.group(0)}" if channel_match else ""
    chip_str = f"powered by the {chip_found} microchip" if chip_found else ""
    
    features = [f for f in [chip_str, channel_str, size_str] if f]
    features_desc = f", {', '.join(features)}" if features else ""
    
    desc = (
        f"The {title} is a professional-grade {category.lower()} component {voltage_str}{features_desc} "
        f"designed for reliable and high-performance electronics prototyping."
    )
    
    # Add application description by category
    apps = {
        "Development Boards": "Ideal for custom IoT systems, microcontroller programming, and smart home automation projects.",
        "Sensors": "Perfect for real-time environment monitoring, telemetry collection, and robotic sensory inputs.",
        "Modules": "Engineered for clean breadboard integration, wireless communication routing, or device expansion setups.",
        "Motors": "Optimized for high-torque motion controls, DIY robotics, smart vehicles, and mechanical assemblies.",
        "Battery": "Provides stable, long-lasting power storage and backup efficiency for portable smart devices.",
        "Displays": "Enables crisp visual readouts, interactive user interfaces, and telemetry monitoring dashboards."
    }
    app_desc = apps.get(category, "Perfect for student learning labs, custom PCB designs, and advanced DIY electronics experiments.")
    desc += f" {app_desc}"
    
    # Append specs from DB if available
    if product.specs and isinstance(product.specs, dict) and len(product.specs) > 0:
        specs_list = []
        for k, v in list(product.specs.items())[:3]:
            specs_list.append(f"{k}: {v}")
        if specs_list:
            desc += f" Key specifications: {'; '.join(specs_list)}."
            
    return desc

def generate_ai_description(product: ProductDB, api_key: str) -> str:
    """
    Invokes Google Gemini API to generate a highly detailed, professional, 
    and unique description paragraph for the product. Handles rate limits
    via retry and exponential backoff.
    """
    try:
        import google.generativeai as genai
    except ImportError:
        print("Error: google-generativeai package is not installed. Run 'pip install google-generativeai' or run without --use-ai.")
        sys.exit(1)
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('models/gemini-flash-latest')
    
    prompt = f"""
    You are an expert technical copywriter and SEO specialist for an e-commerce electronics store called "Tronix365".
    Your task is to write a highly detailed, unique, and SEO-optimized product description for the following electronic component:

    - Product Title: "{product.title}"
    - Category: "{product.category}"
    - Specifications: {json.dumps(product.specs or {})}

    Rules & Formatting Requirements:
    1. The description MUST explicitly detail and incorporate (where applicable):
       - Operational voltage (e.g., 3.3V, 5V, 12V, etc.), current, or general power ratings.
       - Key technical features (like chipset, channels, interface protocols like SPI/I2C, or precision).
       - Practical applications (e.g., DIY robotics, IoT telemetry, smart home automation, Arduino/Raspberry Pi compatible setups).
       - Battery / power requirements (if the product is a battery, charger, power supply, or is battery-operated).
    2. Do not use generic, copy-paste phrasing. Ensure the tone is professional, technical, yet accessible to hobbyists, engineering students, and makers.
    3. Naturally incorporate relevant search terms (e.g., "breadboard prototyping", "Arduino compatible", "sensor integration", "soldering-friendly").
    4. Do not include placeholders, pricing, shipping info, or marketing call-to-actions.
    5. Keep the length between 60 to 120 words (around 3 to 5 clear sentences).
    6. Output ONLY the description text. Do not include any HTML formatting, markdown styling, labels, titles, prefixes like "Description:", or surrounding quotes.
    """
    
    for attempt in range(5):
        try:
            response = model.generate_content(prompt, request_options={"timeout": 30.0})
            desc = response.text.strip()
            # Clean any surrounding quotes
            if desc.startswith('"') and desc.endswith('"'):
                desc = desc[1:-1].strip()
            if desc.startswith("'") and desc.endswith("'"):
                desc = desc[1:-1].strip()
            return desc
        except Exception as e:
            err_str = str(e)
            if any(term in err_str.lower() for term in ["429", "resourceexhausted", "quota", "504", "deadline", "timeout"]):
                sleep_time = 15 * (2 ** attempt) + random.uniform(2, 5)
                print(f"Temporary API error for '{product.title}': {e}. Retrying in {sleep_time:.2f} seconds...", flush=True)
                time.sleep(sleep_time)
            else:
                print(f"Gemini API call failed for '{product.title}': {e}. Falling back to template-based generation.", flush=True)
                return generate_local_description(product)
                
    # If all attempts fail
    print(f"Failed to generate AI description after {5} attempts for '{product.title}'. Using fallback.", flush=True)
    return generate_local_description(product)

def main():
    parser = argparse.ArgumentParser(description="Generate unique SEO product descriptions.")
    parser.add_argument("--use-ai", action="store_true", help="Use Google Gemini API to write descriptions (requires GEMINI_API_KEY in .env)")
    parser.add_argument("--dry-run", action="store_true", help="Print descriptions instead of writing them to the database")
    parser.add_argument("--force", action="store_true", help="Force regenerate descriptions for all products even if they already have one")
    parser.add_argument("--limit", type=int, help="Limit the number of products to process (useful for testing)")
    args = parser.parse_args()

    db: Session = SessionLocal()
    try:
        if args.force:
            print("Force mode enabled: Fetching all products from the database...")
            products = db.query(ProductDB).all()
        else:
            print("Fetching products with empty or missing descriptions...")
            products = db.query(ProductDB).filter(
                (ProductDB.description == "") | (ProductDB.description == None)
            ).all()
        
        if not products:
            print("No products matching the search criteria were found in the database.")
            return

        if args.limit:
            print(f"Limiting execution to the first {args.limit} products...")
            products = products[:args.limit]

        print(f"Found {len(products)} products to process.")
        
        api_key = os.getenv("GEMINI_API_KEY")
        use_ai = args.use_ai and api_key
        
        if args.use_ai and not api_key:
            print("Warning: --use-ai was specified but GEMINI_API_KEY was not found in environment. Defaulting to Offline Mode.")
            
        if use_ai:
            print("Running in Online AI Mode using Gemini API...")
        else:
            print("Running in Offline Template Mode...")

        updated_count = 0
        for i, product in enumerate(products):
            print(f"[{i+1}/{len(products)}] Processing product ID {product.id}: {product.title}...", flush=True)
            
            if use_ai:
                description = generate_ai_description(product, api_key)
            else:
                description = generate_local_description(product)
                
            print(f"Generated Description: {description}\n", flush=True)
            
            if not args.dry_run:
                try:
                    product.description = description
                    db.add(product)
                    db.commit()
                    updated_count += 1
                except Exception as db_err:
                    db.rollback()
                    print(f"Database error saving product ID {product.id}: {db_err}", flush=True)
            
            # Respect Gemini rate limits
            if use_ai and i < len(products) - 1:
                time.sleep(5.5)
                
        if not args.dry_run:
            print(f"Successfully updated {updated_count} product descriptions in the database!", flush=True)
        else:
            print("Dry run completed. No changes were committed to the database.", flush=True)
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()

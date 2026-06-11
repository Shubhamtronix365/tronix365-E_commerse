import os
import sys
import argparse
import random
import json
from dotenv import load_dotenv
from sqlalchemy.orm import Session

# Add current folder to path to import local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal, engine
from models import ProductDB

load_dotenv()

# Dictionary of high-quality templates for electronics categories
# Using title hash ensures the same product gets a consistent description, but different products in the same category get unique phrasing.
TEMPLATES = {
    "Development Boards": [
        "The {title} is a high-performance development board ideal for IoT and microcontroller programming. Designed for both hobbyists and professionals, it provides stable power management and multiple GPIO pins. Perfect for prototyping smart systems, DIY electronics, and learning programming fundamentals.",
        "Get started with your micro-computing projects using the {title}. This board offers robust connectivity and reliable processing power for automation and prototyping. It easily interfaces with various sensors, making it an essential component for any developer's toolkit.",
        "The {title} is an industry-standard development module designed for swift prototyping and hardware debugging. Featuring an accessible layout and versatile pins, it simplifies circuit designs. Perfect for embedded systems engineering and student learning labs."
    ],
    "Sensors": [
        "The {title} is a high-accuracy sensor module designed for real-time environment sensing and measurements. Operating with low power consumption, it provides precise readings to your microcontroller board. Ideal for robotics obstacle detection, home automation, and smart telemetry projects.",
        "Enhance your DIY projects with the {title}. This sensor module provides reliable, fast-response detection and measurement capabilities. It is fully compatible with Arduino, ESP32, and Raspberry Pi, making it perfect for custom automation systems.",
        "The {title} is a responsive electronic sensor module engineered for critical data acquisition. Built with low-noise circuitry, it ensures accurate telemetry feedback for smart projects, weather stations, and interactive robotic devices."
    ],
    "Modules": [
        "The {title} is a compact, high-efficiency breakout module designed for seamless integration into your circuits. Featuring standard pin spacing and high-quality construction, it simplifies complex electronics prototyping. Ideal for communication, power regulation, or relay control in custom projects.",
        "Upgrade your hardware projects with the {title}. This electronics module is engineered for reliable operation and easy breadboard interfacing. It is an excellent choice for wireless IoT setups, home automation, and electronic hardware design.",
        "The {title} is a high-performance interface module designed to expand the capabilities of your microcontrollers. With durable solder pads and built-in protection, it offers stable performance for custom relay systems and wireless projects."
    ],
    "Motors": [
        "The {title} offers high-torque, precise motion control for your robotic and automation creations. Designed for durable and long-lasting performance, it operates smoothly under load. Perfect for building custom robotic arms, smart vehicle steering, and remote-controlled models.",
        "Power your mechanical assemblies with the {title}. This motor is designed for efficiency and steady rotational speed control. It is easy to mount and compatible with standard motor drivers, making it key for robotics hobbyists.",
        "The {title} is a rugged geared motor built to handle heavy-duty loads in electronic and robotic projects. Operating at low power with maximum output torque, it is perfect for smart cars, solar trackers, and motorized pulley setups."
    ],
    "Battery": [
        "The {title} provides stable and long-lasting power for your portable electronic creations. Engineered with built-in safety features, it delivers steady voltage under load. Ideal for drones, portable IoT nodes, and remote microcontroller projects.",
        "Keep your projects powered on the go with the {title}. This battery solution offers high capacity and reliable recharge cycles. It is the perfect compact power pack for DIY robotics, remote sensors, and wearable tech.",
        "The {title} is a high-density, reliable power cell optimized for microelectronics and low-power systems. With stable discharge curves, it ensures safe, continuous operation for portable data loggers and smart wearables."
    ],
    "Displays": [
        "The {title} is a bright, clear display module designed for visual output on your microcontroller projects. With low power consumption and high contrast, it ensures easy readability in any lighting. Perfect for displaying sensor data, menus, and real-time project statistics.",
        "Add a crisp user interface to your electronics with the {title}. This display module is easy to wire and program using standard open-source libraries. Ideal for smart clocks, telemetry monitors, and custom dashboard readouts.",
        "The {title} is a high-resolution screen module designed to provide a rich graphical interface for your smart devices. Easy to configure using SPI or I2C protocols, it is perfect for custom hardware menus, telemetry panels, and readouts."
    ]
}

DEFAULT_TEMPLATES = [
    "The {title} is a premium quality electronic component designed for reliable performance in custom circuits. Built to industry standards, it offers clean signal transmission and durable construction. Perfect for electronics prototyping, student labs, and DIY hardware projects.",
    "Upgrade your electronics toolkit with the {title}. This component ensures robust operation and easy compatibility with standard prototyping boards. It is a highly dependable choice for building, testing, and debugging electronic systems.",
    "The {title} is an essential component for custom circuit construction and laboratory testing. Providing secure connections and long-term durability, it is designed to fit standard breadboard and PCB layouts."
]

def generate_local_description(product: ProductDB) -> str:
    # Use product ID or title hash to randomly but consistently select a template
    random_seed = len(product.title) + (product.id or 0)
    category = product.category
    
    # Get template list
    templates = TEMPLATES.get(category, DEFAULT_TEMPLATES)
    template = templates[random_seed % len(templates)]
    
    # Format description
    description = template.format(title=product.title)
    
    # Append specs if available to make it highly custom
    if product.specs and isinstance(product.specs, dict) and len(product.specs) > 0:
        specs_list = []
        for k, v in list(product.specs.items())[:2]: # take first 2 specs
            specs_list.append(f"{k} of {v}")
        if specs_list:
            description += f" Features key specifications including {', and '.join(specs_list)}."
            
    return description

def generate_ai_description(product: ProductDB, api_key: str) -> str:
    try:
        import google.generativeai as genai
    except ImportError:
        print("Error: google-generativeai package is not installed. Run 'pip install google-generativeai' or run without --use-ai.")
        sys.exit(1)
        
    genai.configure(api_key=api_key)
    
    # Select a lightweight fast model
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    You are an expert copywriter and SEO specialist for an e-commerce electronics store called "Tronix365".
    Your task is to write a high-quality, unique, and SEO-optimized product description for the following product:

    - Title: "{product.title}"
    - Category: "{product.category}"
    - Specs: {json.dumps(product.specs or {{}})}

    Rules:
    1. Output a description of exactly 2 to 3 sentences (40 to 60 words).
    2. Do not use generic copy. Make it sound professional and tailored to hobbyists, engineers, and students.
    3. Incorporate relevant electronics search terms naturally (e.g. "breadboard prototyping", "Arduino compatible", "ESP32 project", "reliable connection", "soldering-free").
    4. Mention the category and application (e.g. "Ideal for DIY robotics and smart home systems").
    5. Do not include placeholders, pricing, or call-to-actions.
    6. Output ONLY the description text, nothing else. No labels or headers.
    """
    
    try:
        response = model.generate_content(prompt)
        desc = response.text.strip()
        # Clean any surrounding quotes
        if desc.startswith('"') and desc.endswith('"'):
            desc = desc[1:-1].strip()
        return desc
    except Exception as e:
        print(f"Gemini API call failed for '{product.title}': {e}. Falling back to template-based generation.")
        return generate_local_description(product)

def main():
    parser = argparse.ArgumentParser(description="Generate unique SEO product descriptions.")
    parser.add_argument("--use-ai", action="store_true", help="Use Google Gemini API to write descriptions (requires GEMINI_API_KEY in .env)")
    parser.add_argument("--dry-run", action="store_true", help="Print descriptions instead of writing them to the database")
    args = parser.parse_args()

    db: Session = SessionLocal()
    try:
        # Fetch products with empty or missing descriptions
        products = db.query(ProductDB).filter(
            (ProductDB.description == "") | (ProductDB.description == None)
        ).all()
        
        if not products:
            print("No products with empty descriptions found in database.")
            return

        print(f"Found {len(products)} products with empty descriptions.")
        
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
            print(f"[{i+1}/{len(products)}] Processing product: {product.title}...")
            
            if use_ai:
                description = generate_ai_description(product, api_key)
            else:
                description = generate_local_description(product)
                
            print(f"Generated Description: {description}\n")
            
            if not args.dry_run:
                product.description = description
                db.add(product)
                updated_count += 1
                
        if not args.dry_run:
            db.commit()
            print(f"Successfully updated {updated_count} product descriptions in the database!")
        else:
            print("Dry run completed. No changes were committed to the database.")
            
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    main()

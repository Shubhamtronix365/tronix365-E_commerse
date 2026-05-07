import os
import json
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure we are loading environment variables
load_dotenv()

# Get the Neon DB URL and ensure it's correct for SQLAlchemy
database_url = os.getenv("DATABASE_URL")
if not database_url:
    print("❌ ERROR: DATABASE_URL is not set in your .env file!")
    print("Please add it: DATABASE_URL=postgresql://neondb_owner:...")
    exit(1)

if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

print(f"🔗 Connecting to database...")

try:
    engine = create_engine(database_url)
    Session = sessionmaker(bind=engine)
    session = Session()

    # Import the Product Model directly from the backend
    from models import Base, ProductDB, UserDB
    from auth import get_password_hash

    # Ensure tables exist (fast and safe for NeonDB)
    Base.metadata.create_all(bind=engine)

    # ---------------------------------------------------------
    # The Mock Data from the Frontend
    # ---------------------------------------------------------
    products_to_seed = [
        {
            "title": "Arduino Uno R3",
            "description": "The classic microcontroller board for your projects. Reliable and easy to use.",
            "price": 450,
            "category": "Development Boards",
            "image": "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Microcontroller": "ATmega328P", "Operating Voltage": "5V"},
            "stock": 45,
        },
        {
            "title": "Raspberry Pi 4 Model B (4GB)",
            "description": "A powerful mini-computer for IoT, media centers, and more.",
            "price": 4500,
            "category": "Development Boards",
            "image": "https://images.unsplash.com/photo-1555617981-d52f6f55c2d7?auto=format&fit=crop&q=80&w=1000",
            "specs": {"RAM": "4GB LPDDR4", "Processor": "Broadcom BCM2711"},
            "stock": 0,
        },
        {
            "title": "HC-SR04 Ultrasonic Sensor",
            "description": "Distance measuring module utilizing ultrasonic waves.",
            "price": 80,
            "category": "Sensors",
            "image": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Range": "2cm - 400cm", "Voltage": "5V"},
            "stock": 120,
        },
        {
            "title": "ESP8266 NodeMCU",
            "description": "WiFi enabled microcontroller for IoT applications.",
            "price": 350,
            "category": "Modules",
            "image": "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=1000",
            "specs": {"WiFi": "802.11 b/g/n", "Voltage": "3.3V"},
            "stock": 15,
        },
        {
            "title": "SG90 Micro Servo Motor",
            "description": "Tiny and lightweight with high output power. Ideal for RC projects.",
            "price": 120,
            "category": "Motors",
            "image": "https://images.unsplash.com/photo-1580835545068-39609c183063?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Torque": "1.8 kg-cm", "Speed": "0.1 sec/60deg"},
            "stock": 60,
        },
        {
            "title": "Li-Po Battery 3.7V 1000mAh",
            "description": "High capacity rechargeable lithium polymer battery.",
            "price": 400,
            "category": "Battery",
            "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR61ba7tNlKqgqKyE_wXqgq6lqqKqqKqqKqqA&s",
            "specs": {"Capacity": "1000mAh", "Voltage": "3.7V"},
            "stock": 0,
        },
        {
            "title": "DHT11 Temperature & Humidity Sensor",
            "description": "Basic digital temperature and humidity sensor.",
            "price": 90,
            "category": "Sensors",
            "image": "https://images.unsplash.com/photo-1581092918056-0c4c3acd90f9?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Temp Range": "0-50°C", "Humidity Range": "20-80%"},
            "stock": 200,
        },
        {
            "title": "OLED Display 0.96 inch",
            "description": "I2C OLED display module for Arduino and Pi.",
            "price": 250,
            "category": "Displays",
            "image": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Resolution": "128x64", "Interface": "I2C"},
            "stock": 8,
        },
    ]

    print(f"📦 Found {len(products_to_seed)} products to seed.")

    # Check if products already exist to prevent duplicates
    existing_count = session.query(ProductDB).count()
    if existing_count > 0:
        print(f"⚠️  Database already contains {existing_count} products.")
        print(
            "To prevent duplicates, I will not seed again. (Delete them first if you want a fresh start)."
        )
    else:
        for p_data in products_to_seed:
            new_product = ProductDB(
                title=p_data["title"],
                description=p_data["description"],
                price=p_data["price"],
                category=p_data["category"],
                image=p_data["image"],
                specs=json.dumps(
                    p_data["specs"]
                ),  # Convert dict to JSON string for SQLite/Postgres compatibility
                stock=p_data["stock"],
            )
            session.add(new_product)

        session.commit()
        print("✅ Successfully seeded NeonDB with all starting products!")

    # ---------------------------------------------------------
    # System Admin Login Credentials
    # ---------------------------------------------------------
    admin_email = "admin@tronix365.in"
    existing_admin = session.query(UserDB).filter(UserDB.email == admin_email).first()

    if existing_admin:
        print(
            f"⚠️  Admin user '{admin_email}' already exists. Skipping admin creation."
        )
    else:
        # Create standard Default Admin
        print(f"🔐 Generating System Admin Account...")
        hashed_password = get_password_hash("admin123")
        admin_user = UserDB(
            full_name="System Administrator",
            email=admin_email,
            hashed_password=hashed_password,
            role="admin",
        )
        session.add(admin_user)
        session.commit()
        print(f"✅ Securely created Admin Profile!")
        print(f"\n======================================")
        print(f"   SYSTEM ADMIN LOGIN CREDENTIALS     ")
        print(f"======================================")
        print(f"Email:    {admin_email}")
        print(f"Password: admin123")
        print(f"======================================\n")

except Exception as e:
    print(f"❌ An error occurred: {e}")
finally:
    if "session" in locals():
        session.close()

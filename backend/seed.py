from sqlalchemy.orm import Session
from database import SessionLocal, engine, Base
from models import ProductDB

# Create tables if they don't exist
# Reset tables (Drop and Recreate) to ensure new schema is applied
print("Dropping old tables...")
Base.metadata.drop_all(bind=engine)
print("Creating new tables...")
Base.metadata.create_all(bind=engine)


def seed_data():
    db = SessionLocal()

    # Check if data exists
    if db.query(ProductDB).first():
        print("Database already contains data. Skipping seed.")
        db.close()
        return

    print("Seeding database...")

    products = [
        {
            "title": "Arduino Uno R3",
            "description": "The classic microcontroller board for your projects. Reliable and easy to use.",
            "price": 450,
            "mrp": 650,
            "sale_price": 450,
            "stock": 50,
            "category": "Development Boards",
            "image": "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Microcontroller": "ATmega328P", "Operating Voltage": "5V"},
            "skv": "SKV-ARD-001",
            "features": [
                "ATmega328P Microcontroller",
                "Operating Voltage: 5V",
                "Input Voltage (recommended): 7-12V",
                "Digital I/O Pins: 14",
            ],
        },
        {
            "title": "Raspberry Pi 4 Model B (4GB)",
            "description": "A powerful mini-computer for IoT, media centers, and more.",
            "price": 4500,
            "mrp": 5500,
            "sale_price": 4500,
            "stock": 15,
            "category": "Development Boards",
            "image": "https://images.unsplash.com/photo-1555617981-d52f6f55c2d7?auto=format&fit=crop&q=80&w=1000",
            "specs": {"RAM": "4GB LPDDR4", "Processor": "Broadcom BCM2711"},
            "skv": "SKV-RPI-002",
            "features": [
                "Broadcom BCM2711, Quad core Cortex-A72 (ARM v8) 64-bit SoC @ 1.5GHz",
                "4GB LPDDR4-3200 SDRAM",
                "2.4 GHz and 5.0 GHz IEEE 802.11ac wireless",
            ],
        },
        {
            "title": "HC-SR04 Ultrasonic Sensor",
            "description": "Distance measuring module utilizing ultrasonic waves.",
            "price": 80,
            "mrp": 150,
            "sale_price": 80,
            "stock": 100,
            "category": "Sensors",
            "image": "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Range": "2cm - 400cm", "Voltage": "5V"},
            "skv": "SKV-SEN-003",
            "features": [
                "Power Supply :+5V DC",
                "Quiescent Current : <2mA",
                "Working Current: 15mA",
                "Effectual Angle: <15°",
                "Ranging Distance : 2cm – 400 cm/1″ – 13ft",
            ],
        },
        {
            "title": "ESP8266 NodeMCU",
            "description": "WiFi enabled microcontroller for IoT applications.",
            "price": 350,
            "mrp": 500,
            "sale_price": 350,
            "stock": 35,
            "category": "Modules",
            "image": "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=1000",
            "specs": {"WiFi": "802.11 b/g/n", "Voltage": "3.3V"},
            "skv": "SKV-MOD-004",
            "features": [
                "Wi-Fi Module - ESP-12E module similar to ESP-12 module but with 6 extra GPIOs",
                "USB - micro USB port for power, programming and debugging",
                "Headers - 2x 2.54mm 15-pin header with access to GPIOs, SPI, UART, ADC and power pins",
            ],
        },
        {
            "title": "SG90 Micro Servo Motor",
            "description": "Tiny and lightweight with high output power. Ideal for RC projects.",
            "price": 120,
            "mrp": 200,
            "sale_price": 120,
            "stock": 60,
            "category": "Motors",
            "image": "https://images.unsplash.com/photo-1580835545068-39609c183063?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Torque": "1.8 kg-cm", "Speed": "0.1 sec/60deg"},
            "skv": "SKV-MOT-005",
            "features": [
                "Operating Voltage: 3.0V~7.2V",
                "Operating Speed: 0.1sec/60degree(4.8V)",
                "Stall Torque: 1.2kg/cm(4.8V)",
                "Dead Band Width: 7usec",
            ],
        },
        {
            "title": "Li-Po Battery 3.7V 1000mAh",
            "description": "High capacity rechargeable lithium polymer battery.",
            "price": 400,
            "mrp": 600,
            "sale_price": 400,
            "stock": 25,
            "category": "Battery",
            "image": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR61ba7tNlKqgqKyE_wXqgq6lqqKqqKqqKqqA&s",
            "specs": {"Capacity": "1000mAh", "Voltage": "3.7V"},
            "skv": "SKV-BAT-006",
            "features": [
                "Voltage: 3.7V",
                "Capacity: 1000mAh",
                "Type: Lithium Polymer",
                "Rechargeable: Yes",
            ],
        },
        {
            "title": "DHT11 Temperature & Humidity Sensor",
            "description": "Basic digital temperature and humidity sensor.",
            "price": 90,
            "mrp": 150,
            "sale_price": 90,
            "stock": 20,
            "category": "Sensors",
            "image": "https://images.unsplash.com/photo-1581092918056-0c4c3acd90f9?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Temp Range": "0-50°C", "Humidity Range": "20-80%"},
            "skv": "SKV-SEN-007",
            "features": [
                "Supply Voltage: +5 V",
                "Temperature Range : 0°C to 50°C",
                "Humidity Range: 20% to 90%",
            ],
        },
        {
            "title": "OLED Display 0.96 inch",
            "description": "I2C OLED display module for Arduino and Pi.",
            "price": 250,
            "mrp": 450,
            "sale_price": 250,
            "stock": 0,
            "category": "Displays",
            "image": "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000",
            "specs": {"Resolution": "128x64", "Interface": "I2C"},
            "skv": "SKV-DIS-008",
            "features": [
                "128x64 pixel resolution",
                "I2C Interface",
                "Driver IC: SSD1306",
                "Operating Voltage: 3.3V - 5V",
            ],
        },
    ]

    try:
        # Seed Products
        for product in products:
            db_product = ProductDB(**product)
            db.add(db_product)

        # Seed Admin User
        from auth import get_password_hash
        from models import UserDB

        admin_email = "admin@tronix365.in"
        # Check if exists (though we dropped tables so likely not)
        if not db.query(UserDB).filter(UserDB.email == admin_email).first():
            print("Seeding Admin User...")
            hashed_password = get_password_hash("adminpassword123")
            admin_user = UserDB(
                email=admin_email,
                hashed_password=hashed_password,
                full_name="System Admin",
                role="admin",
                is_active=True,
            )
            db.add(admin_user)

        db.commit()
        print("Successfully seeded products and admin user!")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()

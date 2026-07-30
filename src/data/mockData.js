export const products = [
    {
        id: 1,
        title: "Arduino Uno R3",
        description: "The classic microcontroller board for your projects. Reliable and easy to use.",
        price: 450,
        category: "Development Boards",
        image: "https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&q=80&w=1000",
        specs: { "Microcontroller": "ATmega328P", "Operating Voltage": "5V" },
        stock: 45
    },
    {
        id: 2,
        title: "Raspberry Pi 4 Model B (4GB)",
        description: "A powerful mini-computer for IoT, media centers, and more.",
        price: 4500,
        category: "Development Boards",
        image: "https://images.unsplash.com/photo-1555617981-d52f6f55c2d7?auto=format&fit=crop&q=80&w=1000",
        specs: { "RAM": "4GB LPDDR4", "Processor": "Broadcom BCM2711" },
        stock: 0
    },
    {
        id: 3,
        title: "HC-SR04 Ultrasonic Sensor",
        description: "Distance measuring module utilizing ultrasonic waves.",
        price: 80,
        category: "Sensors",
        image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=1000",
        specs: { "Range": "2cm - 400cm", "Voltage": "5V" },
        stock: 120
    },
    {
        id: 4,
        title: "ESP8266 NodeMCU",
        description: "WiFi enabled microcontroller for IoT applications.",
        price: 350,
        category: "Modules",
        image: "https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&q=80&w=1000",
        specs: { "WiFi": "802.11 b/g/n", "Voltage": "3.3V" },
        stock: 15
    },
    {
        id: 5,
        title: "SG90 Micro Servo Motor",
        description: "Tiny and lightweight with high output power. Ideal for RC projects.",
        price: 120,
        category: "Motors",
        image: "https://images.unsplash.com/photo-1580835545068-39609c183063?auto=format&fit=crop&q=80&w=1000",
        specs: { "Torque": "1.8 kg-cm", "Speed": "0.1 sec/60deg" },
        stock: 60
    },
    {
        id: 6,
        title: "Li-Po Battery 3.7V 1000mAh",
        description: "High capacity rechargeable lithium polymer battery.",
        price: 400,
        category: "Battery",
        image: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR61ba7tNlKqgqKyE_wXqgq6lqqKqqKqqKqqA&s", // Placeholder
        specs: { "Capacity": "1000mAh", "Voltage": "3.7V" },
        stock: 0
    },
    {
        id: 7,
        title: "DHT11 Temperature & Humidity Sensor",
        description: "Basic digital temperature and humidity sensor.",
        price: 90,
        category: "Sensors",
        image: "https://images.unsplash.com/photo-1581092918056-0c4c3acd90f9?auto=format&fit=crop&q=80&w=1000",
        specs: { "Temp Range": "0-50°C", "Humidity Range": "20-80%" },
        stock: 200
    },
    {
        id: 8,
        title: "OLED Display 0.96 inch",
        description: "I2C OLED display module for Arduino and Pi.",
        price: 250,
        category: "Displays",
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1000",
        specs: { "Resolution": "128x64", "Interface": "I2C" },
        stock: 8
    }
];

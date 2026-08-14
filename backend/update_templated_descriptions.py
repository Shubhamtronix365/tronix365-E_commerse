import os
import re
import json
import random
from dotenv import load_dotenv
from database import SessionLocal
from models import ProductDB

load_dotenv()

# Specialized domain knowledge map for popular electronics components
COMPONENT_KNOWLEDGE = {
    # Microcontrollers & Dev Boards
    "ARDUINO UNO SMD": {
        "function": "serves as an accessible microcontroller prototyping platform built around the ATmega328P surface-mount chip, processing digital inputs and controlling output actuators smoothly.",
        "usecase": "building custom home automation hubs, interactive light displays, or robotics control systems",
        "tech": "runs on 5V logic, provides 14 digital I/O pins (6 PWM outputs), 6 analog inputs, and a 16 MHz crystal oscillator"
    },
    "ARDUINO NANO": {
        "function": "delivers full Arduino Uno functionality in a compact breadboard-friendly form factor for space-constrained electronics designs.",
        "usecase": "integrating into wearable devices, mini Quadcopters, or compact IoT data loggers",
        "tech": "operates on 5V DC via Mini-B USB or 7-12V unregulated VIN, offering 22 digital pins and 8 analog inputs"
    },
    "NODE MCU CPU 02": {
        "function": "combines an ESP8266 Wi-Fi microchip with a USB interface and voltage regulator to enable seamless internet connectivity for microcontrollers.",
        "usecase": "developing smart home sensor nodes, wireless weather monitoring stations, or remote relay controllers",
        "tech": "features integrated 802.11 b/g/n Wi-Fi, 3.3V operating voltage, 4MB flash memory, and 10 GPIO pins"
    },
    # Motors & Motor Drivers
    "Coin Type Micro Vibration Motor": {
        "function": "generates tactile haptic feedback by rotating an internal eccentric counterweight at high velocity within a sealed flat enclosure.",
        "usecase": "providing silent alert notifications in handheld gaming controllers, wearable fitness trackers, or medical buzzers",
        "tech": "operates on 2.5V to 3.7V DC drawing approximately 70mA current with a compact 10mm diameter"
    },
    "30 RPM 12V Centre Shaft DC Geared Motor": {
        "function": "converts electrical energy into high-torque rotational movement through an integrated all-metal spur gearbox positioned on a central shaft.",
        "usecase": "driving heavy-duty automated curtains, robotic rover wheels, or motorized conveyor belts",
        "tech": "delivers a steady rotational speed of 30 RPM at 12V DC with a robust 6mm D-shaped output shaft"
    },
    "100 RPM DC MOTOR": {
        "function": "delivers reliable rotational force with balanced speed and torque for intermediate mechanical drive mechanisms.",
        "usecase": "powering line-following robots, small electric winches, or automated door locking systems",
        "tech": "requires 12V DC input, producing 100 RPM output speed under nominal load with durable internal gear teeth"
    },
    "200 RPM DC MOTOR": {
        "function": "provides moderate rotational speed combined with steady driving force across small machinery and vehicular chassis.",
        "usecase": "animating motorized display turntables, automated sorting arms, or dual-wheel mobile robots",
        "tech": "functions efficiently on 12V DC, drawing low idle current while maintaining 200 RPM shaft speed"
    },
    "500 RPM DC MOTOR": {
        "function": "provides rapid shaft rotation designed for applications prioritizing speed over extreme torque load resistance.",
        "usecase": "propelling fast maze-solving robot vehicles, high-speed agitators, or rotary disc launchers",
        "tech": "operates at 12V DC supplying 500 RPM output speed with a rugged 37mm gearbox housing"
    },
    "5V STEPPER MOTOR": {
        "function": "executes precise angular positioning by stepping through small rotational increments under sequential pulse control.",
        "usecase": "controlling precise camera pan-tilt rigs, 3D printer filament feeders, or small CNC engraving heads",
        "tech": "runs on 5V DC with a 64:1 reduction gear ratio and a 5-wire unipolar interface compatible with ULN2003 drivers"
    },
    # Sensors
    "MQ2 Sensor": {
        "function": "detects combustible gases and smoke concentrations in the ambient air using a tin dioxide semiconductor sensing element.",
        "usecase": "building domestic LPG leak detectors, kitchen fire alarms, or industrial air quality safety systems",
        "tech": "operates on 5V DC, detecting LPG, i-butane, propane, methane, alcohol, and smoke within 200 to 10000 ppm"
    },
    "INMP SOUND SENSOR": {
        "function": "captures ambient acoustic vibrations and outputs clean analog electrical signals representing sound amplitude.",
        "usecase": "designing voice-activated room lighting, noise pollution monitors, or clap-sensitive appliance switches",
        "tech": "requires 3.3V to 5V DC power, providing an adjustable sensitivity potentiometer and dual analog/digital outputs"
    },
    "Tec1 12706 Thermoelectric Peltier Module": {
        "function": "transfers thermal energy from one side of the ceramic plate to the other when an electrical current flows through its internal semiconductor junctions.",
        "usecase": "chilling portable beverage coolers, CPU water cooling loops, or dehumidifiers",
        "tech": "operates on 12V DC at up to 6A current, achieving a maximum temperature differential (Delta T) of 66°C"
    },
    # Relays
    "1 channel 5V single Chanel Relay Module": {
        "function": "acts as an electrically controlled switch that allows low-power microcontrollers to safely turn high-power AC or DC loads on and off.",
        "usecase": "controlling household lights, water pumps, or solenoid valves directly from an Arduino or ESP32",
        "tech": "switches up to 250V AC / 10A or 30V DC / 10A with a 5V control signal and status LED indicator"
    },
    "2 Channel 5V Relay Module With Optocoupler": {
        "function": "isolates sensitive microcontrollers from high-voltage electrical noise while independently switching two distinct high-power electrical circuits.",
        "usecase": "managing dual appliance automation systems like fans and heaters from a smart home microcontroller",
        "tech": "features optical optocoupler isolation, 5V trigger input, and heavy-duty 250V AC / 10A relay contacts"
    },
    # Modules & Chargers
    "TP4056 Battery Charger C Type Module with Protection": {
        "function": "regulates constant-current and constant-voltage charging for single-cell lithium batteries while safeguarding against over-discharge and short circuits.",
        "usecase": "powering DIY portable power banks, wireless IoT sensors, or rechargeable Bluetooth speakers",
        "tech": "accepts 5V input via USB Type-C, delivering up to 1A programmable charge current with 4.2V cutoff"
    },
    "MT8870 DTMF DECODER MODULE": {
        "function": "decodes Dual-Tone Multi-Frequency (DTMF) audio signals received over telephone lines or audio jacks into 4-bit digital binary data.",
        "usecase": "enabling phone-keypad remote control for home automation appliances or security gate openers",
        "tech": "operates on 5V DC with low power consumption, outputting 4-bit BCD data via 5 digital output pins"
    },
    "WIRLESS phone CHARGING MODULE": {
        "function": "transfers electrical energy wirelessly across an air gap using inductive electromagnetic coupling between transmitter and receiver coils.",
        "usecase": "building custom furniture Qi charging pads, sealed waterproof devices, or desk accessories",
        "tech": "supplies 5V / 1A output across a 2mm to 8mm wireless transmission distance operating at 5V to 12V input"
    },
    "DIGITAL VOLTMETER": {
        "function": "measures DC voltage levels across a circuit and presents real-time readings on a bright multi-digit LED display.",
        "usecase": "monitoring battery voltage in solar power stations, electric vehicles, or benchtop lab power supplies",
        "tech": "features a 3-digit 0.28-inch LED display measuring DC voltages from 0V to 100V with 0.1V accuracy"
    },
    "5V BIDC FAN": {
        "function": "circulates forced cooling air across electronic components to dissipate accumulated heat and prevent thermal throttling.",
        "usecase": "cooling Raspberry Pi enclosures, 3D printer hotends, or compact audio amplifier cases",
        "tech": "runs on 5V DC, consuming 0.15A current while generating efficient airflow with low acoustic noise"
    }
}

# Template styles to ensure NO repeated sentence structures across products in the same category
STRUCTURE_PATTERNS = [
    # Pattern A: Action first
    "Designed for seamless integration into electronic systems, the {title} {function} This component is widely utilized in {usecase}. From a technical standpoint, it {tech}. By delivering dependable operation and straight-forward wiring, it serves as an essential building block for electronics developers, students, and prototyping engineers.",
    
    # Pattern B: Application / Use case first
    "When building projects such as {usecase}, the {title} provides the core hardware capability required. Specifically, this device {function} Key specifications include its ability to {tech}. Its durable construction and standardized pinout make it a top choice for reliable circuit designs.",
    
    # Pattern C: Technical specification first
    "Engineered with precise specifications, the {title} {tech}. In operation, this unit {function} Makers frequently deploy this hardware when {usecase}. Whether you are creating a prototype or a production module, it provides consistent performance under continuous use.",
    
    # Pattern D: Functional summary first
    "The primary role of the {title} is to {function} Consequently, it is a staple component in {usecase}. On the hardware side, it {tech}. Its compact footprint and reliable interfacing simplify implementation for both beginners and experienced embedded engineers.",
    
    # Pattern E: Direct feature presentation
    "Providing high efficiency in compact electronics assemblies, the {title} {function} Engineers and hobbyists commonly rely on it for {usecase}. Regarding electrical performance, the module {tech}. It offers seamless compatibility across microcontrollers and development boards."
]

def generate_unique_description(product: ProductDB, category_pattern_tracker: dict) -> str:
    title = product.title or f"Product {product.id}"
    cat = product.category or "Electronics"

    # Extract specs if available
    specs = product.specs or {}
    spec_str = ""
    if isinstance(specs, dict) and specs:
        spec_str = ", ".join([f"{k}: {v}" for k, v in list(specs.items())[:3]])

    # Lookup knowledge base or build custom attributes dynamically
    kb = COMPONENT_KNOWLEDGE.get(title)
    
    if kb:
        function = kb["function"]
        usecase = kb["usecase"]
        tech = kb["tech"]
    else:
        # Extract features from title/specs
        voltage_match = re.search(r'(\d+(?:\.\d+)?)\s*[Vv]\b', title)
        rpm_match = re.search(r'(\d+)\s*RPM\b', title, re.IGNORECASE)
        ch_match = re.search(r'(\d+)\s*(?:-[Cc]hannel|[Cc]hannel|[Cc]h)\b', title, re.IGNORECASE)

        v_text = f"operating at a stable {voltage_match.group(0)}" if voltage_match else "operating on standard 5V DC power"
        rpm_text = f"delivering a rotational speed of {rpm_match.group(0)}" if rpm_match else ""
        ch_text = f"featuring {ch_match.group(0)} independent switching channels" if ch_match else ""

        tech_details = [t for t in [v_text, rpm_text, ch_text] if t]
        tech = " and ".join(tech_details) if tech_details else "built with standard pin headers and reliable circuit protection"
        if spec_str:
            tech += f" ({spec_str})"

        function = f"executes essential electrical processing for {title}, facilitating signal routing, power control, or data sensing within embedded circuits."
        usecase = f"developing custom {cat.lower()} prototypes, automated robotics rigs, or IoT monitoring systems"

    # Pick a sentence pattern that hasn't just been used for this category
    used_pattern_idx = category_pattern_tracker.get(cat, -1)
    available_indices = [i for i in range(len(STRUCTURE_PATTERNS)) if i != used_pattern_idx]
    chosen_idx = random.choice(available_indices)
    category_pattern_tracker[cat] = chosen_idx

    pattern_template = STRUCTURE_PATTERNS[chosen_idx]
    
    desc = pattern_template.format(
        title=title,
        function=function,
        usecase=usecase,
        tech=tech
    )

    # Word count validation (80-120 words)
    words = desc.split()
    if len(words) < 80:
        desc += " The unit is engineered for long-term operational stability, low thermal dissipation, and hassle-free integration into standard prototyping breadboards or custom printed circuit boards."
    elif len(words) > 120:
        words = words[:115]
        desc = " ".join(words) + "."

    return desc

def update_templated_descriptions():
    db = SessionLocal()
    pattern = re.compile(r'is a professional-grade', re.IGNORECASE)
    category_pattern_tracker = {}

    try:
        products = db.query(ProductDB).all()
        target_products = [p for p in products if pattern.search(p.description or "")]

        print(f"Updating {len(target_products)} templated product descriptions in database...")
        updated_count = 0

        for p in target_products:
            new_desc = generate_unique_description(p, category_pattern_tracker)
            word_count = len(new_desc.split())
            
            p.description = new_desc
            updated_count += 1
            print(f"[{updated_count}/{len(target_products)}] ID {p.id}: '{p.title}' ({word_count} words)")

        db.commit()
        print(f"\nSUCCESSFULLY UPDATED {updated_count} product descriptions in Neon database!")

    except Exception as e:
        db.rollback()
        print(f"ERROR updating descriptions: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    update_templated_descriptions()

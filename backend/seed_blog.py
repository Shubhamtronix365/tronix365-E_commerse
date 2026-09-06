import sys
from database import SessionLocal, engine, Base
from models import BlogPostDB

def seed_sample_blog():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        existing = db.query(BlogPostDB).filter(BlogPostDB.slug == "getting-started-esp32-iot-robotics-guide").first()
        if existing:
            print("Sample blog already exists.")
            return

        post = BlogPostDB(
            title="Getting Started with ESP32-WROOM: Autonomous Robotics & Wireless Telemetry",
            slug="getting-started-esp32-iot-robotics-guide",
            summary="A comprehensive engineering walkthrough covering dual-core pinout configurations, I2C sensor bus integration, motor PWM control, and low-latency Wi-Fi telemetry.",
            content="""<h2>1. Introduction to the ESP32 Architecture</h2>
<p>The <strong>ESP32-WROOM-32D</strong> is one of the most versatile dual-core microcontrollers for robotics, industrial monitoring, and automation. Powered by the Xtensa 32-bit LX6 dual-core processor running at up to 240 MHz, it integrates Wi-Fi 802.11 b/g/n and Bluetooth v4.2 BR/EDR and BLE.</p>

<h3>Key Hardware Specifications:</h3>
<ul>
  <li><strong>Core Processor:</strong> Dual-core Xtensa 32-bit LX6 @ 240 MHz</li>
  <li><strong>SRAM:</strong> 520 KB on-chip internal memory</li>
  <li><strong>Flash:</strong> 4 MB SPI Flash</li>
  <li><strong>Wireless:</strong> 2.4 GHz Wi-Fi (up to 150 Mbps) + Bluetooth Low Energy (BLE)</li>
  <li><strong>Operating Voltage:</strong> 3.0 V to 3.6 V (Standard 3.3V logic levels)</li>
</ul>

<h2>2. Hardware Pinout & Sensor Wiring</h2>
<p>When interfacing hardware with the ESP32, avoid strapping pins during boot (GPIO 0, 2, 5, 12, 15). The recommended pin mapping for I2C telemetry and motor control is shown below:</p>

<table class="table-auto w-full text-left border-collapse border border-white/10 my-4">
  <thead>
    <tr class="bg-white/10 text-white">
      <th class="p-3 border border-white/10">Module / Sensor</th>
      <th class="p-3 border border-white/10">ESP32 GPIO</th>
      <th class="p-3 border border-white/10">Signal Type</th>
      <th class="p-3 border border-white/10">Notes</th>
    </tr>
  </thead>
  <tbody>
    <tr class="border-b border-white/5">
      <td class="p-3 border border-white/10 font-mono">MPU-6050 (IMU)</td>
      <td class="p-3 border border-white/10 font-mono text-emerald-400">GPIO 21 (SDA)</td>
      <td class="p-3 border border-white/10">I2C Data</td>
      <td class="p-3 border border-white/10">Requires 4.7kΩ pull-up resistor</td>
    </tr>
    <tr class="border-b border-white/5">
      <td class="p-3 border border-white/10 font-mono">MPU-6050 (IMU)</td>
      <td class="p-3 border border-white/10 font-mono text-emerald-400">GPIO 22 (SCL)</td>
      <td class="p-3 border border-white/10">I2C Clock</td>
      <td class="p-3 border border-white/10">Shared bus for OLED displays</td>
    </tr>
    <tr class="border-b border-white/5">
      <td class="p-3 border border-white/10 font-mono">Motor Driver PWM-A</td>
      <td class="p-3 border border-white/10 font-mono text-emerald-400">GPIO 18</td>
      <td class="p-3 border border-white/10">LEDC PWM (20 kHz)</td>
      <td class="p-3 border border-white/10">Motor Left speed control</td>
    </tr>
    <tr class="border-b border-white/5">
      <td class="p-3 border border-white/10 font-mono">Motor Driver PWM-B</td>
      <td class="p-3 border border-white/10 font-mono text-emerald-400">GPIO 19</td>
      <td class="p-3 border border-white/10">LEDC PWM (20 kHz)</td>
      <td class="p-3 border border-white/10">Motor Right speed control</td>
    </tr>
  </tbody>
</table>

<blockquote>
  <strong>Engineering Pro-Tip:</strong> Always isolate high-current inductive motor spikes from the ESP32 3.3V power rail by utilizing an external 5V UBEC or low-dropout regulator (LDO) with flyback diodes on the H-Bridge.
</blockquote>

<h2>3. Firmware Implementation: Low-Latency Wi-Fi Telemetry</h2>
<p>Here is the reference C++ firmware snippet initializing both cores and transmitting sensor telemetry packets over UDP socket:</p>

<pre><code class="language-cpp">#include &lt;WiFi.h&gt;
#include &lt;Wire.h&gt;

const char* ssid = "Tronix365-Lab";
const char* password = "SuperSecurePassword";

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22); // Custom I2C pins
  
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(200);
    Serial.print(".");
  }
  
  Serial.println("\n[Tronix365] Connected! IP Address: ");
  Serial.println(WiFi.localIP());
}

void loop() {
  // Read gyroscope and transmit telemetry
  delay(100);
}</code></pre>

<h2>4. Summary & Next Steps</h2>
<p>With dual core multiprocessing and high-speed PWM generators, the ESP32 handles motion control loops on Core 0 while concurrently servicing Wi-Fi telemetry and WebSockets on Core 1 without timing jitter.</p>
""",
            category="Tutorials",
            layout_type="hardware_guide",
            cover_image="/uploads/image.png",
            author_name="Tronix365 Engineering Team",
            author_role="Senior Embedded Systems Engineer",
            tags=["ESP32", "Robotics", "IoT", "Pinouts", "Arduino", "Embedded"],
            reading_time_minutes=6,
            is_published=True,
            featured=True,
            views_count=142,
            components_used=[
                {"name": "ESP32-WROOM-32D Development Board", "sku": "TRX-ESP32-D", "link": "/shop"},
                {"name": "MPU-6050 6-DOF Accelerometer & Gyroscope", "sku": "TRX-MPU-6050", "link": "/shop"},
                {"name": "L298N Dual H-Bridge Motor Driver Module", "sku": "TRX-L298N", "link": "/shop"},
                {"name": "N20 Micro Metal Gear Motor with Encoder", "sku": "TRX-N20-ENC", "link": "/shop"},
            ],
            meta_title="ESP32 Robotics & Hardware Telemetry Guide | Tronix365",
            meta_description="Master ESP32 hardware architecture, pinouts, I2C telemetry, and motor PWM control with Tronix365.",
        )
        db.add(post)
        db.commit()
        print(f"Sample blog seeded successfully with ID: {post.id}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_sample_blog()

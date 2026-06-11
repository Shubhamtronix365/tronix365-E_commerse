<?php
// PHP Meta-tag Injector for React SPA (Hostinger/Apache)
// Intercepts search engines and injects SEO meta tags & structured data.

$baseUrl = "https://www.tronix365.in/e-commerse";
$apiUrl = "https://tronix365-e-commerse.onrender.com";

// 1. Determine request path
$requestUri = $_SERVER['REQUEST_URI'];
// Remove subdirectory path /e-commerse/ from request
$path = str_replace('/e-commerse', '', $requestUri);
$path = parse_url($path, PHP_URL_PATH);
$path = trim($path, '/');

// Defaults
$title = "Tronix365 | Premium Electronic Components";
$description = "Shop high-quality Arduino boards, sensors, ESP32 modules, robotics parts, and IoT devices at Tronix365.";
$image = $baseUrl . "/Tronix3650final_circular.png";
$url = $baseUrl . $_SERVER['REQUEST_URI'];
$extraHead = "";

// Helper to sanitize text for meta tags
function escapeMeta($text) {
    return htmlspecialchars(strip_tags(trim($text)), ENT_QUOTES, 'UTF-8');
}

// 2. Route Matching
if (preg_match('/^product\/([a-zA-Z0-9_-]+)$/', $path, $matches)) {
    // Product Page
    $slugOrId = $matches[1];
    $isId = ctype_digit($slugOrId);
    $fetchUrl = $isId ? "$apiUrl/products/$slugOrId" : "$apiUrl/products/slug/$slugOrId";

    // Fetch product details from FastAPI backend
    $ctx = stream_context_create([
        'http' => [
            'timeout' => 2.5, // Fast timeout to avoid blocking users
            'header' => "Accept: application/json\r\n"
        ]
    ]);
    $response = @file_get_contents($fetchUrl, false, $ctx);
    
    if ($response) {
        $product = json_decode($response, true);
        if ($product) {
            $pName = escapeMeta($product['title']);
            $title = "$pName | Tronix365";
            $description = escapeMeta(substr($product['description'], 0, 160));
            if (!empty($product['image'])) {
                // Check if absolute URL or relative
                $image = (strpos($product['image'], 'http') === 0) ? $product['image'] : "$apiUrl/" . ltrim($product['image'], '/');
            }
            
            // Build Schema.org Product JSON-LD
            $sku = !empty($product['skv']) ? $product['skv'] : "SKU-" . strtoupper(preg_replace('/[^A-Z0-9]/', '-', $pName));
            $stockStatus = ($product['stock'] > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
            
            $productSchema = [
                "@context" => "https://schema.org",
                "@type" => "Product",
                "name" => $pName,
                "description" => $description,
                "image" => $image,
                "category" => escapeMeta($product['category']),
                "sku" => $sku,
                "brand" => [
                    "@type" => "Brand",
                    "name" => "Tronix365"
                ],
                "offers" => [
                    "@type" => "Offer",
                    "url" => $url,
                    "priceCurrency" => "INR",
                    "price" => $product['price'],
                    "itemCondition" => "https://schema.org/NewCondition",
                    "availability" => $stockStatus
                ]
            ];
            
            // Build BreadcrumbList JSON-LD
            $breadcrumbSchema = [
                "@context" => "https://schema.org",
                "@type" => "BreadcrumbList",
                "itemListElement" => [
                    [
                        "@type" => "ListItem",
                        "position" => 1,
                        "name" => "Home",
                        "item" => "$baseUrl/"
                    ],
                    [
                        "@type" => "ListItem",
                        "position" => 2,
                        "name" => $product['category'],
                        "item" => "$baseUrl/category/" . strtolower(str_replace(' ', '-', $product['category']))
                    ],
                    [
                        "@type" => "ListItem",
                        "position" => 3,
                        "name" => $pName,
                        "item" => $url
                    ]
                ]
            ];
            
            $extraHead .= "\n<script type=\"application/ld+json\">" . json_encode($productSchema) . "</script>";
            $extraHead .= "\n<script type=\"application/ld+json\">" . json_encode($breadcrumbSchema) . "</script>";
        }
    }
} else if (preg_match('/^category\/([a-zA-Z0-9_-]+)$/', $path, $matches)) {
    // Category Page
    $catSlug = strtolower($matches[1]);
    $categorySeo = [
        'sensors' => [
            'title' => 'Electronic Sensors - Ultrasonic, Temperature, IR Sensors',
            'desc' => 'Shop high-quality ultrasonic, temperature, humidity, IR, and obstacle sensors for your microcontrollers. Best prices in India with fast delivery.',
            'faqs' => [
                ['q' => 'What are sensors in electronics?', 'a' => 'Sensors are devices that detect changes in the physical environment (like temperature, distance, light, motion) and convert them into electrical signals that microcontrollers like Arduino can read.'],
                ['q' => 'Can I use these sensors with ESP32 or Raspberry Pi?', 'a' => 'Yes, most sensors are compatible with Arduino, ESP32, ESP8266, and Raspberry Pi operating at 3.3V or 5V.']
            ]
        ],
        'development-boards' => [
            'title' => 'Microcontroller & Development Boards - Arduino, Raspberry Pi',
            'desc' => 'Get authentic Arduino Uno, Raspberry Pi, and other microcontroller development boards. Perfect for students, developers, and electronics hobbyists.',
            'faqs' => [
                ['q' => 'What is the difference between Arduino and Raspberry Pi?', 'a' => 'Arduino is a microcontroller board designed for executing simple code and interacting with sensors directly. Raspberry Pi is a full single-board computer running an OS, suitable for heavy computations and IoT projects.']
            ]
        ],
        'modules' => [
            'title' => 'Electronic Modules & IoT Boards - WiFi, Bluetooth, Relay',
            'desc' => 'Buy high-performance ESP32 development boards, NodeMCU ESP8266, and WiFi modules for IoT and smart home projects at Tronix365.',
            'faqs' => [
                ['q' => 'Does the ESP32 board support Bluetooth and WiFi?', 'a' => 'Yes, ESP32 has integrated Wi-Fi and Bluetooth capabilities, making it ideal for remote monitoring and IoT applications.']
            ]
        ],
        'motors' => [
            'title' => 'Robotics Parts & Motors - Servos, Gear Motors, Steppers',
            'desc' => 'Explore robotics components, SG90 servo motor, DC gear motor, and accessories. Build your next robotic arm or rover with Tronix365.',
            'faqs' => [
                ['q' => 'What is an SG90 servo motor?', 'a' => 'The SG90 is a lightweight micro-servo motor that rotates 180 degrees, commonly used in small RC planes, robotics, and servo control projects.']
            ]
        ],
        'battery' => [
            'title' => 'Li-Po & Lithium-Ion Rechargeable Batteries',
            'desc' => 'High capacity, safe lithium polymer (Li-Po) and lithium-ion batteries. Lightweight power solutions for drones, RC planes, and portable devices.',
            'faqs' => []
        ],
        'displays' => [
            'title' => 'IoT Display Modules - OLED, LCD, I2C Displays',
            'desc' => 'Discover essential electronics modules including OLED displays, I2C screens, and relay control boards. Easy interface with your smart projects.',
            'faqs' => [
                ['q' => 'How do I interface an OLED display with Arduino?', 'a' => 'Most OLED modules use the I2C interface (SDA/SCL pins) and can be programmed using libraries like Adafruit SSD1306 in the Arduino IDE.']
            ]
        ]
    ];
    
    if (isset($categorySeo[$catSlug])) {
        $catData = $categorySeo[$catSlug];
        $title = $catData['title'] . " | Tronix365";
        $description = $catData['desc'];
        
        if (!empty($catData['faqs'])) {
            $mainEntity = [];
            foreach ($catData['faqs'] as $faq) {
                $mainEntity[] = [
                    "@type" => "Question",
                    "name" => $faq['q'],
                    "acceptedAnswer" => [
                        "@type" => "Answer",
                        "text" => $faq['a']
                    ]
                ];
            }
            $faqSchema = [
                "@context" => "https://schema.org",
                "@type" => "FAQPage",
                "mainEntity" => $mainEntity
            ];
            $extraHead .= "\n<script type=\"application/ld+json\">" . json_encode($faqSchema) . "</script>";
        }
    }
}

// 3. Load React build file index.html
$html = file_get_contents('index.html');

// 4. Inject dynamic SEO tags
$metaReplacement = "
  <title>" . htmlspecialchars($title) . "</title>
  <meta name=\"description\" content=\"" . htmlspecialchars($description) . "\" />
  <link rel=\"canonical\" href=\"" . htmlspecialchars($url) . "\" />
  
  <meta property=\"og:title\" content=\"" . htmlspecialchars($title) . "\" />
  <meta property=\"og:description\" content=\"" . htmlspecialchars($description) . "\" />
  <meta property=\"og:image\" content=\"" . htmlspecialchars($image) . "\" />
  <meta property=\"og:url\" content=\"" . htmlspecialchars($url) . "\" />
  <meta property=\"og:type\" content=\"website\" />
  
  <meta name=\"twitter:card\" content=\"summary_large_image\" />
  <meta name=\"twitter:title\" content=\"" . htmlspecialchars($title) . "\" />
  <meta name=\"twitter:description\" content=\"" . htmlspecialchars($description) . "\" />
  <meta name=\"twitter:image\" content=\"" . htmlspecialchars($image) . "\" />
" . $extraHead;

// Remove existing title tag
$html = preg_replace('/<title>.*?<\/title>/i', '', $html);

// Inject meta replacement inside head
$html = str_replace('<head>', "<head>" . $metaReplacement, $html);

// 5. Output modified HTML
echo $html;
?>

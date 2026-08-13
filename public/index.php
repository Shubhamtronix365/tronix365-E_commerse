<?php
// PHP Meta-tag Injector for React SPA (Hostinger/Apache)
// Intercepts search engines and injects SEO meta tags & structured data.

$baseUrl = "https://www.tronix365.in/e-commerse";
$apiUrl = "https://tronix365-e-commerse.onrender.com";

// Helper to load DATABASE_URL from environment or local .env files
function getDatabaseUrl() {
    $url = getenv('DATABASE_URL');
    if ($url) return $url;
    
    $paths = [
        __DIR__ . '/.env',
        __DIR__ . '/../.env',
        __DIR__ . '/../backend/.env',
        __DIR__ . '/backend/.env',
    ];
    
    foreach ($paths as $path) {
        if (file_exists($path)) {
            $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                if (strpos(trim($line), '#') === 0) continue;
                $parts = explode('=', $line, 2);
                if (count($parts) === 2 && trim($parts[0]) === 'DATABASE_URL') {
                    return trim($parts[1], " \t\n\r\0\x0B\"'");
                }
            }
        }
    }
    return null;
}

// Normalize function for PHP title matching
function phpNormalize($s) {
    if (!$s) return "";
    $t = strtolower($s);
    $t = preg_replace('/[^a-z0-9\s_-]/', '', $t);
    $t = preg_replace('/[\s_-]+/', '-', $t);
    return trim($t, '-');
}

// Robust URL fetching using cURL (fallback to file_get_contents)
function fetchUrl($url, $timeout = 5.0) {
    if (function_exists('curl_init')) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Accept: application/json'
        ]);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($httpCode === 200) {
            return $response;
        }
        return false;
    } else {
        $ctx = stream_context_create([
            'http' => [
                'timeout' => $timeout,
                'header' => "Accept: application/json\r\n"
            ]
        ]);
        return @file_get_contents($url, false, $ctx);
    }
}

// Initialize direct PostgreSQL connection using PDO (highly available, bypasses Render cold starts)
$pdo = null;
$dbUrl = getDatabaseUrl();
if ($dbUrl) {
    $parsedUrl = parse_url($dbUrl);
    if ($parsedUrl) {
        $host = $parsedUrl['host'];
        $port = $parsedUrl['port'] ?? 5432;
        $dbname = ltrim($parsedUrl['path'], '/');
        $user = $parsedUrl['user'];
        $pass = $parsedUrl['pass'];
        
        $sslmode = "require";
        if (isset($parsedUrl['query'])) {
            parse_str($parsedUrl['query'], $queryParams);
            if (isset($queryParams['sslmode'])) {
                $sslmode = $queryParams['sslmode'];
            }
        }
        
        $dsn = "pgsql:host=$host;port=$port;dbname=$dbname;sslmode=$sslmode";
        try {
            $pdo = new PDO($dsn, $user, $pass, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::TIMEOUT => 3
            ]);
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
        }
    }
}

// 1. Determine request path
$requestUri = $_SERVER['REQUEST_URI'];
$parsedRequestUrl = parse_url($requestUri);
$cleanPath = $parsedRequestUrl['path'];

// Remove subdirectory path /e-commerse/ from request robustly (only from the start of path)
$path = $cleanPath;
if (strpos($path, '/e-commerse') === 0) {
    $path = substr($path, strlen('/e-commerse'));
}
$path = trim($path, '/');

// DYNAMIC SITEMAP INTERCEPTION (Queries Neon DB directly to avoid Render timeouts)
if ($path === 'sitemap.xml') {
    header("Content-Type: application/xml; charset=utf-8");
    
    $products = null;
    if ($pdo) {
        try {
            $stmt = $pdo->query("SELECT id, title, category, skv, image, price, stock FROM products");
            $products = $stmt->fetchAll();
        } catch (PDOException $e) {
            $products = null;
        }
    }
    
    // Fallback 1: Fetch via Render API
    if (!$products) {
        $response = fetchUrl("$apiUrl/products?limit=1000", 3.0);
        if ($response) {
            $products = json_decode($response, true);
        }
    }
    
    // Fallback 2: Local metadata JSON
    if (!$products) {
        $jsonPath = __DIR__ . '/products_metadata.json';
        if (file_exists($jsonPath)) {
            $products = json_decode(file_get_contents($jsonPath), true);
        }
    }
    
    $staticRoutes = ['', '/shop', '/categories', '/about', '/contact', '/terms', '/privacy', '/return-refund'];
    $categoryRoutes = [
        '/category/development-boards',
        '/category/sensors',
        '/category/modules',
        '/category/motors',
        '/category/battery',
        '/category/displays'
    ];
    
    $xml = '<?xml version="1.0" encoding="UTF-8"?>' . "\n";
    $xml .= '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
    
    foreach ($staticRoutes as $r) {
        $priority = ($r === '') ? '1.0' : (($r === '/shop' || $r === '/categories') ? '0.8' : '0.5');
        $xml .= "  <url>\n    <loc>$baseUrl$r</loc>\n    <changefreq>daily</changefreq>\n    <priority>$priority</priority>\n  </url>\n";
    }
    
    foreach ($categoryRoutes as $r) {
        $xml .= "  <url>\n    <loc>$baseUrl$r</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>\n";
    }
    
    if (is_array($products)) {
        foreach ($products as $p) {
            $slug = phpNormalize($p['title']);
            if (!empty($slug)) {
                $xml .= "  <url>\n    <loc>$baseUrl/product/$slug</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n";
            }
        }
    }
    
    $xml .= '</urlset>';
    echo $xml;
    exit;
}

// Defaults
$title = "Tronix365 | Premium Electronic Components";
$description = "Shop high-quality Arduino boards, sensors, ESP32 modules, robotics parts, and IoT devices at Tronix365.";
$image = $baseUrl . "/Tronix3650final_circular.png";

// Canonical URL cleanup: remove query parameters and trailing slashes consistently
$url = "https://www.tronix365.in" . rtrim($cleanPath, '/');
if ($cleanPath === '/e-commerse' || $cleanPath === '/e-commerse/') {
    $url = "https://www.tronix365.in/e-commerse/";
}
$extraHead = "";

// Helper to sanitize text for meta tags
function escapeMeta($text) {
    return htmlspecialchars(strip_tags(trim($text)), ENT_QUOTES, 'UTF-8');
}

// Dynamic fallback description generator
function phpGenerateDescription($title, $category) {
    $voltage = '';
    if (preg_match('/(\d+(?:\.\d+)?)\s*[Vv]\b/', $title, $matches)) {
        $voltage = $matches[0];
    }
    
    $voltageStr = $voltage ? "operating at a stable $voltage" : "with standard operating voltage";
    $cat = $category ? $category : "Electronics";
    
    $desc = "The " . $title . " is a professional-grade " . strtolower($cat) . " component $voltageStr, designed for reliable and high-performance electronics prototyping.";
    
    if ($cat === "Development Boards") {
        $desc .= " Ideal for custom IoT systems, microcontroller programming, and smart home automation projects.";
    } elseif ($cat === "Sensors") {
        $desc .= " Perfect for real-time environment monitoring, telemetry collection, and robotic sensory inputs.";
    } elseif ($cat === "Modules") {
        $desc .= " Engineered for clean breadboard integration, wireless communication routing, or device expansion setups.";
    } else {
        $desc .= " Perfect for student learning labs, custom PCB designs, and advanced DIY electronics experiments.";
    }
    
    return $desc;
}

// 2. Route Matching
if (preg_match('/^product\/([a-zA-Z0-9_-]+)$/', $path, $matches)) {
    // Product Page
    $slugOrId = $matches[1];
    $isId = ctype_digit($slugOrId);
    
    $product = null;
    
    // 1. Direct query database (highly available, bypasses Render sleep)
    if ($pdo) {
        try {
            if ($isId) {
                $stmt = $pdo->prepare("SELECT * FROM products WHERE id = :id");
                $stmt->execute(['id' => $slugOrId]);
                $product = $stmt->fetch();
            } else {
                $stmt = $pdo->query("SELECT * FROM products");
                $allProds = $stmt->fetchAll();
                $target = phpNormalize($slugOrId);
                foreach ($allProds as $p) {
                    if (!empty($p['title']) && phpNormalize($p['title']) === $target) {
                        $product = $p;
                        break;
                    }
                    if (!empty($p['skv']) && strcasecmp($p['skv'], $slugOrId) === 0) {
                        $product = $p;
                        break;
                    }
                }
            }
        } catch (PDOException $e) {
            $product = null;
        }
    }

    // 2. Fallback: Load product locally from metadata JSON
    if (!$product) {
        $jsonPath = __DIR__ . '/products_metadata.json';
        if (file_exists($jsonPath)) {
            $jsonData = json_decode(file_get_contents($jsonPath), true);
            if (is_array($jsonData)) {
                foreach ($jsonData as $item) {
                    if ($isId) {
                        if (isset($item['id']) && $item['id'] == $slugOrId) {
                            $product = $item;
                            break;
                        }
                    } else {
                        if (isset($item['slug']) && strcasecmp($item['slug'], $slugOrId) === 0) {
                            $product = $item;
                            break;
                        }
                    }
                }
            }
        }
    }

    // 3. Fallback: Fetch via FastAPI backend cURL
    if (!$product) {
        $fetchUrl = $isId ? "$apiUrl/products/$slugOrId" : "$apiUrl/products/slug/$slugOrId";
        $response = fetchUrl($fetchUrl, 5.0);
        if ($response) {
            $product = json_decode($response, true);
        }
    }
    
    if ($product) {
        $pName = escapeMeta($product['title']);
        // Format title intelligently with Buy Online
        $title = "$pName | Buy Online | Tronix365";
        
        // Dynamic fallback description check
        $descRaw = (!empty($product['description']) && strlen(trim($product['description'])) >= 30) ? $product['description'] : phpGenerateDescription($product['title'], $product['category'] ?? 'Electronics');
        $description = escapeMeta(substr($descRaw, 0, 160));
        
        $isPlaceholder = empty($product['image']) || strpos($product['image'], 'placehold.co') !== false || strpos($product['image'], 'No+Image') !== false || strpos($product['image'], 'No Image') !== false || strpos($product['image'], 'data:') === 0;
        
        if ($isPlaceholder) {
            $image = $baseUrl . "/Tronix3650final_circular.png";
        } else {
            // Check if absolute URL or relative
            $image = (strpos($product['image'], 'http') === 0) ? $product['image'] : "$apiUrl/" . ltrim($product['image'], '/');
        }
        
        // Build Schema.org Product JSON-LD
        // Fix SKU generation by converting to uppercase first and collapsing hyphens with dynamic prefix
        $prefix = "TRX-" . (!empty($product['category']) ? strtoupper(substr(preg_replace('/[^A-Za-z]/', '', $product['category']), 0, 3)) : "MSC");
        $sku = !empty($product['skv']) ? $product['skv'] : $prefix . "-" . trim(preg_replace('/[^A-Z0-9]+/', '-', strtoupper($pName)), '-');
        $stockStatus = ($product['stock'] > 0) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
        
        $productSchema = [
            "@context" => "https://schema.org",
            "@type" => "Product",
            "name" => $pName,
            "description" => escapeMeta($descRaw),
            "category" => escapeMeta($product['category'] ?? 'Electronics'),
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

        // Omit image property if it is a placeholder
        if (!$isPlaceholder) {
            $productSchema["image"] = $image;
        }
        
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
} else if ($path === 'shop') {
    $title = "Shop Electronic Components Online | Tronix365";
    $description = "Browse our catalog of microcontrollers, IoT boards, sensors, motors, and robotics parts. Filter by category, price, and search term.";
} else if ($path === 'categories') {
    $title = "Browse Components Categories | Tronix365";
    $description = "Find the perfect microcontrollers, development boards, sensors, and robotics parts for your project categorized for easy browsing.";
} else if ($path === 'about') {
    $title = "About Us | Tronix365";
    $description = "Learn about Tronix365, our mission, guaranteed quality, and expert technical support for electronics makers and hobbyists.";
} else if ($path === 'contact') {
    $title = "Contact Us | Tronix365";
    $description = "Get in touch with Tronix365 support for product questions, order help, and sales. Contact via email, phone, or live form.";
} else if ($path === 'terms') {
    $title = "Terms & Conditions | Tronix365";
    $description = "Read the terms and conditions for purchasing genuine electronic components and using the Tronix365 platform.";
} else if ($path === 'privacy') {
    $title = "Privacy Policy | Tronix365";
    $description = "Review the privacy policy of Tronix365. We protect your personal data and ensure secure transactions.";
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

const fs = require('fs');
const axios = require('axios');

// API Configuration
const API_URL = 'https://tronix365-e-commerse.onrender.com';

// Category-specific keyword templates
const categoryKeywords = {
    'Sensors': [
        'electronic sensors India', 'ultrasonic sensor', 'temperature sensor', 'IR sensor', 
        'load cell sensor', 'pressure sensor', 'motion sensor', 'proximity sensor',
        'Arduino sensors', 'ESP32 sensors', 'IoT sensors', 'robotics sensors',
        'industrial sensors', 'automation sensors', 'smart home sensors'
    ],
    'Development Boards': [
        'Arduino boards India', 'Arduino Uno', 'Arduino Mega', 'Arduino Nano',
        'Raspberry Pi', 'ESP32 board', 'ESP8266 NodeMCU', 'microcontroller',
        'development board', 'programming board', 'embedded systems',
        'IoT development', 'electronics prototyping', 'DIY electronics'
    ],
    'Modules': [
        'ESP32 module', 'WiFi module', 'Bluetooth module', 'relay module',
        'motor driver module', 'power module', 'sensor module', 'communication module',
        'IoT module', 'wireless module', 'Arduino module', 'ESP8266 module',
        'RF module', 'GPS module', 'camera module'
    ],
    'Motors': [
        'servo motor India', 'DC motor', 'stepper motor', 'gear motor',
        'brushless motor', 'robotics motor', 'Arduino motor', 'ESP32 motor',
        'motor driver', 'motor controller', 'robotics parts', 'automation motor',
        'precision motor', 'high torque motor'
    ],
    'Displays': [
        'LCD display', 'OLED display', 'TFT display', 'LED display',
        '7-segment display', 'touch screen', 'Arduino display', 'ESP32 display',
        'monitor', 'screen module', 'digital display', 'graphics display'
    ],
    'Robotics Kits': [
        'robotics kit India', 'Arduino robot kit', 'STEM kit', 'educational robot',
        'DIY robot', 'robot arm kit', 'mobile robot', 'autonomous robot',
        'robotics project', 'electronics kit', 'learning kit', 'hobby robot'
    ],
    'Battery': [
        'Li-Po battery', 'Li-ion battery', 'battery pack', 'power bank',
        'charger module', 'battery management', 'Arduino power', 'ESP32 power',
        'rechargeable battery', 'high capacity battery', 'robotics battery'
    ],
    'IoT Devices': [
        'IoT device', 'smart device', 'home automation', 'wireless sensor',
        'connected device', 'smart home', 'IoT gateway', 'mesh network',
        'IoT platform', 'industrial IoT', 'smart electronics'
    ],
    'Cables': [
        'jumper wires', 'USB cable', 'programming cable', 'connector',
        'breadboard wires', 'DuPont cables', 'ribbon cable', 'audio cable',
        'power cable', 'data cable', 'Arduino cables', 'ESP32 cables'
    ],
    'Switches': [
        'tactile switch', 'push button', 'toggle switch', 'slide switch',
        'rocker switch', 'limit switch', 'micro switch', 'Arduino switch',
        'momentary switch', 'illuminated switch', 'panel mount switch'
    ],
    'Miscellaneous': [
        'electronic components', 'PCB', 'breadboard', 'prototyping board',
        'resistor', 'capacitor', 'LED', 'transistor', 'diode', 'IC',
        'electronic parts', 'hardware components', 'DIY electronics'
    ],
    'Other': [
        'electronic accessories', 'specialty components', 'custom parts',
        'experimental components', 'niche electronics', 'rare components'
    ]
};

// Enhanced description generators for different product types
function generateEnhancedDescription(product) {
    const { title, category, specs, features, applications } = product;
    
    let baseDescription = '';
    
    // Category-specific descriptions
    switch(category) {
        case 'Sensors':
            baseDescription = `The ${title} is a high-precision sensing device designed for accurate measurement and detection in electronic systems. This advanced sensor module provides reliable performance for Arduino, ESP32, Raspberry Pi, and other microcontroller platforms. Built with premium quality components, it ensures consistent readings and long-term durability in various environmental conditions. Perfect for industrial automation, robotics projects, IoT applications, and educational purposes. The sensor features excellent sensitivity, quick response time, and low power consumption, making it ideal for battery-operated devices. Easy to integrate with standard electronic circuits and compatible with most development boards. This sensor is widely used in home automation systems, security devices, weather monitoring equipment, and smart appliances. The robust construction ensures resistance to dust, moisture, and temperature variations, providing reliable operation in demanding environments. Ideal for engineers, hobbyists, students, and professionals working on cutting-edge electronics projects in India.`;
            break;
            
        case 'Development Boards':
            baseDescription = `The ${title} is a powerful microcontroller development board designed for electronics prototyping, IoT development, and embedded systems programming. This board features advanced processing capabilities, multiple input/output pins, and comprehensive connectivity options including WiFi, Bluetooth, and USB interfaces. Perfect for developing smart home devices, robotics systems, automation controllers, and data logging applications. The board comes with pre-programmed bootloaders and supports popular programming environments like Arduino IDE, PlatformIO, and MicroPython. Built with high-quality components and robust power management circuitry, it ensures stable operation even in demanding conditions. The extensive pinout provides flexibility for connecting sensors, displays, motors, communication modules, and other peripherals. Ideal for electronics enthusiasts, engineering students, researchers, and professional developers working on innovative projects across India. This development board offers excellent performance-to-price ratio and is backed by comprehensive documentation and community support.`;
            break;
            
        case 'Modules':
            baseDescription = `The ${title} is a versatile electronic module designed to extend the functionality of microcontroller boards and embedded systems. This high-performance module provides seamless integration with Arduino, ESP32, Raspberry Pi, and other popular development platforms. Engineered for reliability and ease of use, it features plug-and-play compatibility with standard electronic circuits and breadboard setups. The module incorporates advanced circuitry for signal processing, power management, and communication protocols, ensuring stable operation in various applications. Perfect for IoT projects, home automation systems, robotics applications, and industrial automation. The compact design and low power consumption make it suitable for battery-operated devices and space-constrained installations. Built with premium quality components and rigorous testing standards, this module delivers consistent performance and long-term durability. Comprehensive documentation and example code are available for quick integration into your projects. Ideal for electronics hobbyists, students, engineers, and professionals seeking reliable modular solutions for their innovative electronic designs in India.`;
            break;
            
        case 'Motors':
            baseDescription = `The ${title} is a high-performance electric motor designed for robotics, automation, and precision motion control applications. This motor delivers excellent torque, smooth operation, and reliable performance across a wide speed range. Engineered with advanced magnetic materials and precision engineering, it provides consistent power output and efficient energy conversion. Perfect for robotic arms, mobile robots, CNC machines, 3D printers, automated systems, and various motion control projects. The motor features robust construction with high-quality bearings and durable housing, ensuring long service life even under demanding operating conditions. Compatible with standard motor drivers and controllers, it offers easy integration with Arduino, ESP32, and other microcontroller platforms. The low noise operation and precise speed control make it suitable for applications requiring smooth and accurate movement. Ideal for robotics enthusiasts, engineering students, automation professionals, and DIY builders working on advanced mechanical projects in India. This motor represents excellent value with professional-grade performance at an affordable price point.`;
            break;
            
        case 'Displays':
            baseDescription = `The ${title} is a high-quality display module designed for electronics projects requiring visual output and user interface capabilities. This display features excellent resolution, vibrant colors, and wide viewing angles, making it perfect for data visualization, user interfaces, and multimedia applications. Compatible with Arduino, ESP32, Raspberry Pi, and other popular microcontroller platforms, it offers easy integration through standard communication interfaces like I2C, SPI, and parallel connections. The display module incorporates advanced backlight technology for clear visibility in various lighting conditions, while maintaining low power consumption for battery-operated devices. Built with durable materials and robust construction, it ensures reliable operation in different environmental conditions. Perfect for IoT dashboards, measurement instruments, gaming devices, information displays, and interactive projects. The module comes with comprehensive libraries and example code for quick development. Ideal for electronics hobbyists, students, engineers, and professionals working on projects requiring professional-grade display solutions in India. This display delivers exceptional performance and value for a wide range of applications.`;
            break;
            
        case 'Robotics Kits':
            baseDescription = `The ${title} is a comprehensive robotics kit designed for learning, experimentation, and building advanced robotic systems. This all-inclusive kit contains all essential components including microcontroller boards, motors, sensors, mechanical parts, and connection cables required to assemble fully functional robots. Perfect for STEM education, engineering projects, hobby robotics, and skill development in mechatronics and automation. The kit features high-quality components with detailed assembly instructions and example code for programming various robot behaviors and functionalities. Designed for progressive learning, it allows users to start with basic projects and advance to complex autonomous systems. The mechanical parts are precision-engineered for smooth movement and durability, while electronic components ensure reliable performance. Compatible with popular programming platforms like Arduino IDE and visual programming environments. Ideal for students, teachers, robotics enthusiasts, and anyone interested in learning practical robotics and automation concepts. This kit provides hands-on experience with sensor integration, motor control, wireless communication, and intelligent programming - essential skills for modern electronics and robotics development in India.`;
            break;
            
        case 'Battery':
            baseDescription = `The ${title} is a high-performance power solution designed for electronics projects, robotics, portable devices, and backup power applications. This battery features advanced chemistry technology for high energy density, stable voltage output, and long cycle life. Engineered with safety mechanisms including overcharge protection, short circuit protection, and thermal management, it ensures safe and reliable operation in various applications. Perfect for Arduino projects, ESP32 IoT devices, robotics systems, portable instruments, and emergency power backup. The battery delivers consistent performance across different load conditions and maintains capacity over multiple charge-discharge cycles. Compatible with standard charging circuits and battery management systems, it offers easy integration into your electronic designs. The compact form factor and lightweight construction make it suitable for space-constrained and weight-sensitive applications. Built with premium quality materials and rigorous quality control, this battery meets international safety and performance standards. Ideal for electronics hobbyists, engineers, students, and professionals seeking reliable power solutions for their innovative projects across India. This battery represents excellent value with professional-grade performance and safety features.`;
            break;
            
        case 'IoT Devices':
            baseDescription = `The ${title} is an advanced Internet of Things device designed for smart connectivity, remote monitoring, and automated control applications. This IoT device features powerful processing capabilities, multiple communication interfaces including WiFi, Bluetooth, and optional cellular connectivity, and comprehensive sensor integration options. Perfect for smart home automation, industrial monitoring, environmental sensing, security systems, and data logging applications. The device comes with pre-configured firmware and supports popular IoT platforms like Arduino IoT Cloud, AWS IoT, Google Cloud IoT, and custom MQTT implementations. Built with robust hardware and secure communication protocols, it ensures reliable data transmission and protection against unauthorized access. The low power design enables battery operation for remote deployments, while the wide operating temperature range allows outdoor installations. Easy to configure through web interfaces or mobile apps, it requires minimal programming knowledge for basic setups. Ideal for IoT developers, system integrators, smart home enthusiasts, and professionals working on connected device solutions in India. This IoT device delivers enterprise-grade features at consumer-friendly pricing.`;
            break;
            
        case 'Cables':
            baseDescription = `The ${title} is a high-quality connectivity solution designed for reliable electrical connections in electronics projects, prototyping, and system integration. This cable features premium conductor materials, flexible insulation, and durable connectors designed for multiple mating cycles. Perfect for Arduino projects, breadboard prototyping, device programming, sensor connections, and inter-board communication. The cable ensures excellent signal integrity, low resistance, and reliable data transfer even in electrically noisy environments. Available in various lengths and configurations to suit different application requirements. The connectors are designed for secure fit and easy insertion/removal without damage to pins or sockets. Compatible with standard electronic components and development boards, this cable provides plug-and-play convenience for your projects. Built with strict quality control and tested for electrical performance, it meets international standards for safety and reliability. Ideal for electronics hobbyists, students, engineers, and professionals who require dependable connectivity solutions for their electronic designs in India. This cable represents excellent value with professional-grade construction and performance characteristics suitable for both hobby and professional applications.`;
            break;
            
        case 'Switches':
            baseDescription = `The ${title} is a high-quality switching device designed for reliable electrical control in electronics projects, user interfaces, and automation systems. This switch features robust construction, smooth actuation, and excellent electrical characteristics for consistent performance over thousands of operations. Perfect for Arduino projects, control panels, user interfaces, safety systems, and manual override functions. The switch provides reliable contact closure with minimal bounce and low contact resistance, ensuring clean signal transmission. The mechanical design offers comfortable operation with tactile feedback, while the electrical specifications handle various voltage and current requirements. Available in different configurations including momentary, latching, illuminated, and panel-mount options to suit diverse application needs. The terminals are designed for secure soldering or wire connections, and the housing provides protection against dust and moisture. Compatible with standard electronic circuits and microcontroller inputs, this switch integrates easily into your designs. Ideal for electronics hobbyists, students, engineers, and professionals seeking dependable switching solutions for their projects in India. This switch delivers professional-grade performance with excellent durability and reliability.`;
            break;
            
        case 'Miscellaneous':
            baseDescription = `The ${title} is a versatile electronic component designed for various applications in circuit design, prototyping, and system integration. This component features high-quality construction, precise specifications, and reliable performance characteristics essential for professional and hobby electronics projects. Perfect for Arduino projects, circuit repair, educational experiments, and custom electronic designs. The component meets or exceeds industry standards for electrical performance, thermal stability, and mechanical durability. Carefully selected and tested for quality, it ensures consistent operation in different circuit conditions and environments. Whether used in analog circuits, digital systems, power supplies, or signal processing applications, this component delivers the performance and reliability expected in professional electronics. The specifications are clearly documented for easy integration into circuit calculations and design simulations. Compatible with standard PCB layouts and breadboard setups, it offers flexibility in prototyping and production. Ideal for electronics enthusiasts, students, engineers, and maintenance professionals who require quality components for their work in India. This component represents excellent value with professional-grade quality and performance characteristics.`;
            break;
            
        case 'Other':
            baseDescription = `The ${title} is a specialized electronic product designed for specific applications requiring unique features or capabilities. This product incorporates advanced design elements and quality construction to meet the demands of specialized electronics projects, research applications, or custom solutions. Perfect for experimental setups, custom designs, niche applications, and projects requiring non-standard components. The product features reliable performance characteristics and is built with attention to detail for consistent operation in its intended applications. Whether used for research and development, custom manufacturing, specialized equipment, or unique electronic solutions, this product provides the functionality and quality needed for professional results. The specifications and operating parameters are optimized for its specific use case, ensuring optimal performance in target applications. Built with quality materials and tested for reliability, it meets the standards expected in professional electronics. Ideal for researchers, specialized engineers, custom equipment builders, and professionals working on unique electronic solutions in India. This product delivers the specialized performance required for advanced and custom applications.`;
            break;
            
        default:
            baseDescription = `The ${title} is a high-quality electronic component designed for reliable performance in various applications. This product features excellent construction, precise specifications, and dependable operation characteristics suitable for professional and hobby electronics projects. Perfect for Arduino projects, circuit design, prototyping, and system integration. The component is built with premium materials and undergoes rigorous quality testing to ensure consistent performance and durability. Whether used in educational projects, DIY electronics, professional applications, or industrial systems, this product delivers the reliability and performance expected from quality electronic components. The specifications are well-documented for easy integration into circuit designs and system configurations. Compatible with standard electronic practices and development platforms, it offers versatility for different applications. Ideal for electronics enthusiasts, students, engineers, and professionals seeking dependable components for their projects in India. This product represents excellent value with professional-grade quality and performance characteristics suitable for a wide range of electronic applications and use cases.`;
    }
    
    // Add category-specific enhancements
    if (specs && typeof specs === 'object') {
        const specKeys = Object.keys(specs);
        if (specKeys.length > 0) {
            baseDescription += ` Key specifications include: ${specKeys.slice(0, 3).map(key => `${key}: ${specs[key]}`).join(', ')}. `;
        }
    }
    
    if (features && Array.isArray(features) && features.length > 0) {
        baseDescription += ` Notable features: ${features.slice(0, 2).join(', ')}. `;
    }
    
    if (applications && Array.isArray(applications) && applications.length > 0) {
        baseDescription += ` Common applications: ${applications.slice(0, 2).join(', ')}. `;
    }
    
    // Add India-specific and SEO content
    baseDescription += ` This product is readily available for delivery across India with fast shipping and secure packaging. It comes with appropriate warranty coverage and customer support to ensure satisfaction with your purchase. Trusted by electronics enthusiasts, students, and professionals throughout India for its quality and reliability.`;
    
    return baseDescription;
}

// Generate comprehensive keywords for each product
function generateKeywords(product) {
    const { title, category, skv, specs } = product;
    const keywords = new Set();
    
    // Add category-specific keywords
    if (categoryKeywords[category]) {
        categoryKeywords[category].forEach(keyword => keywords.add(keyword));
    }
    
    // Extract keywords from title
    const titleWords = title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(word => word.length > 2);
    
    titleWords.forEach(word => {
        keywords.add(word);
        keywords.add(`${word} India`);
        keywords.add(`buy ${word}`);
        keywords.add(`${word} online`);
        keywords.add(`${word} price`);
    });
    
    // Add category variations
    if (category) {
        keywords.add(category.toLowerCase());
        keywords.add(`${category.toLowerCase()} India`);
        keywords.add(`buy ${category.toLowerCase()}`);
        keywords.add(`${category.toLowerCase()} online`);
    }
    
    // Add SKU if available
    if (skv) {
        keywords.add(skv);
        keywords.add(`${skv} India`);
    }
    
    // Add technical specifications if available
    if (specs && typeof specs === 'object') {
        Object.values(specs).forEach(value => {
            if (typeof value === 'string' && value.length > 2) {
                const specWords = value.toLowerCase()
                    .replace(/[^a-z0-9\s]/g, ' ')
                    .split(/\s+/)
                    .filter(word => word.length > 2);
                specWords.forEach(word => keywords.add(word));
            }
        });
    }
    
    // Add common electronics keywords
    const commonKeywords = [
        'electronics', 'Arduino', 'ESP32', 'Raspberry Pi', 'microcontroller',
        'sensor', 'module', 'development board', 'IoT', 'robotics',
        'DIY electronics', 'electronic components', 'online electronics store',
        'genuine components', 'quality electronics', 'fast delivery India',
        'electronics shopping India', 'Tronix365'
    ];
    
    commonKeywords.forEach(keyword => keywords.add(keyword));
    
    // Convert to array and limit to 30 most relevant keywords
    return Array.from(keywords).slice(0, 30);
}

// Main enhancement function
async function enhanceProducts() {
    console.log('Fetching products from API...');
    
    try {
        // Fetch all products
        const response = await axios.get(`${API_URL}/products?limit=1000`);
        const products = response.data;
        
        console.log(`Found ${products.length} products to enhance`);
        
        let enhancedCount = 0;
        let skippedCount = 0;
        const enhancedProducts = [];
        
        for (const product of products) {
            // Check if product needs enhancement (150+ words, not characters)
            const wordCount = product.description ? product.description.split(/\s+/).length : 0;
            const needsDescription = !product.description || wordCount < 150;
            const needsKeywords = !product.keywords || product.keywords.length === 0;
            
            if (!needsDescription && !needsKeywords) {
                skippedCount++;
                continue;
            }
            
            const enhancedProduct = { ...product };
            
            // Enhance description if needed
            if (needsDescription) {
                enhancedProduct.description = generateEnhancedDescription(product);
                console.log(`Enhanced description for: ${product.title.substring(0, 50)}...`);
            }
            
            // Add keywords if missing
            if (needsKeywords) {
                enhancedProduct.keywords = generateKeywords(product);
                console.log(`Added keywords for: ${product.title.substring(0, 50)}...`);
            }
            
            enhancedCount++;
            enhancedProducts.push({
                id: product.id,
                title: product.title,
                description: enhancedProduct.description,
                keywords: enhancedProduct.keywords,
                original_word_count: wordCount,
                new_word_count: enhancedProduct.description.split(/\s+/).length,
                keywords_count: enhancedProduct.keywords.length
            });
            
            // Small delay to avoid overwhelming the API
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('\n=== Enhancement Summary ===');
        console.log(`Total products processed: ${products.length}`);
        console.log(`Products enhanced: ${enhancedCount}`);
        console.log(`Products skipped (already complete): ${skippedCount}`);
        
        // Show sample of enhanced products
        if (enhancedProducts.length > 0) {
            console.log('\n=== Sample Enhanced Products ===');
            enhancedProducts.slice(0, 3).forEach(prod => {
                console.log(`\nProduct: ${prod.title.substring(0, 40)}...`);
                console.log(`Original word count: ${prod.original_word_count}`);
                console.log(`New word count: ${prod.new_word_count}`);
                console.log(`Keywords added: ${prod.keywords_count}`);
                console.log(`Sample keywords: ${prod.keywords.slice(0, 5).join(', ')}...`);
            });
        }
        
        // Save enhanced products data for manual application
        fs.writeFileSync('enhanced_products_data.json', JSON.stringify(enhancedProducts, null, 2));
        console.log('✅ Saved enhanced products data to enhanced_products_data.json');
        
        // Create SQL update statements for database application
        const sqlStatements = enhancedProducts.map(prod => {
            const descEscaped = prod.description.replace(/'/g, "''").replace(/\n/g, "\\n");
            const keywordsEscaped = JSON.stringify(prod.keywords).replace(/'/g, "''");
            return `UPDATE products SET description = '${descEscaped}', keywords = '${keywordsEscaped}' WHERE id = ${prod.id};`;
        }).join('\n');
        
        fs.writeFileSync('update_products.sql', sqlStatements);
        console.log('✅ Saved SQL update statements to update_products.sql');
        
        // Create individual product update files for easy application
        const individualUpdates = enhancedProducts.map(prod => ({
            product_id: prod.id,
            title: prod.title,
            updates: {
                description: prod.description,
                keywords: prod.keywords
            }
        }));
        
        fs.writeFileSync('individual_product_updates.json', JSON.stringify(individualUpdates, null, 2));
        console.log('✅ Saved individual product updates to individual_product_updates.json');
        
        console.log('\n=== Next Steps ===');
        console.log('1. Review enhanced_products_data.json for the enhanced content');
        console.log('2. Use update_products.sql to update your database directly');
        console.log('3. Or use individual_product_updates.json for API updates with authentication');
        console.log('4. The script skipped products that already have descriptions >= 150 words and keywords');
        
    } catch (error) {
        console.error('Error during product enhancement:', error.message);
        process.exit(1);
    }
}

// Run the enhancement
enhanceProducts();
const fs = require('fs');
const path = require('path');

// Configuration
const BASE_URL = 'https://www.tronix365.in/e-commerse';
const API_URL = process.env.VITE_API_URL || 'https://tronix365-e-commerse.onrender.com';

const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const staticRoutes = [
  '',
  '/shop',
  '/categories',
  '/about',
  '/contact',
  '/terms',
  '/privacy'
];

const categoryRoutes = [
  '/category/development-boards',
  '/category/sensors',
  '/category/modules',
  '/category/motors',
  '/category/battery',
  '/category/displays'
];

async function generate() {
  console.log('Generating Sitemap.xml...');
  
  let productRoutes = [];
  try {
    console.log(`Fetching products from API: ${API_URL}/products`);
    const response = await fetch(`${API_URL}/products?limit=1000`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const products = await response.json();
    console.log(`Found ${products.length} products to map.`);
    
    productRoutes = products.map(p => `/product/${slugify(p.title)}`);
  } catch (err) {
    console.warn('API fetch failed during sitemap generation. Falling back to local mock data...', err);
    // Basic fallback to seed products list to prevent failure
    const mockTitles = [
      "Arduino Uno R3",
      "Raspberry Pi 4 Model B (4GB)",
      "HC-SR04 Ultrasonic Sensor",
      "ESP8266 NodeMCU",
      "SG90 Micro Servo Motor",
      "Li-Po Battery 3.7V 1000mAh",
      "DHT11 Temperature & Humidity Sensor",
      "OLED Display 0.96 inch"
    ];
    productRoutes = mockTitles.map(title => `/product/${slugify(title)}`);
  }

  const allRoutes = [...staticRoutes, ...categoryRoutes, ...productRoutes];

  const xmlEntries = allRoutes.map(route => {
    // Determine priority
    let priority = '0.5';
    if (route === '') priority = '1.0';
    else if (route === '/shop' || route === '/categories') priority = '0.8';
    else if (route.startsWith('/category/')) priority = '0.7';
    else if (route.startsWith('/product/')) priority = '0.6';

    const changefreq = route.startsWith('/product/') ? 'weekly' : 'daily';

    return `  <url>
    <loc>${BASE_URL}${route}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
  }).join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>`;

  // Write to public folder
  const publicDir = path.resolve(__dirname, '../public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8');
  console.log(`Sitemap written to ${path.join(publicDir, 'sitemap.xml')}`);

  // Write to dist folder if it exists
  const distDir = path.resolve(__dirname, '../dist');
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap.xml'), sitemapXml, 'utf8');
    console.log(`Sitemap also written to ${path.join(distDir, 'sitemap.xml')}`);
  }
}

generate().catch(console.error);

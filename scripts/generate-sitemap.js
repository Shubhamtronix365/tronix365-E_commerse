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
  '/blogs',
  '/tower-orders',
  '/about',
  '/contact',
  '/terms',
  '/privacy',
  '/return-refund'
];

const fallbackCategories = [
  'development-boards',
  'sensors',
  'modules',
  'motors',
  'battery',
  'displays',
  'robotics-kits',
  'iot-devices'
];

async function generate() {
  console.log('Generating Sitemap.xml...');

  // 1. Fetch Categories
  let categoryRoutes = [];
  try {
    console.log(`Fetching categories from API: ${API_URL}/categories`);
    const catRes = await fetch(`${API_URL}/categories`);
    if (catRes.ok) {
      const cats = await catRes.json();
      if (Array.isArray(cats) && cats.length > 0) {
        categoryRoutes = cats.map(c => `/category/${slugify(typeof c === 'string' ? c : c.name || c.category)}`);
        console.log(`Mapped ${categoryRoutes.length} categories from API.`);
      }
    }
  } catch (err) {
    console.warn('Categories API fetch failed, using fallback category list...', err.message);
  }
  if (categoryRoutes.length === 0) {
    categoryRoutes = fallbackCategories.map(c => `/category/${c}`);
  }

  // 2. Fetch Blog Posts
  let blogRoutes = [];
  try {
    console.log(`Fetching published blog posts from API: ${API_URL}/blogs?limit=1000`);
    const blogRes = await fetch(`${API_URL}/blogs?limit=1000`);
    if (blogRes.ok) {
      const blogData = await blogRes.json();
      const articles = Array.isArray(blogData) ? blogData : (blogData.posts || []);
      const published = articles.filter(p => p.is_published !== false && p.slug);
      blogRoutes = published.map(p => `/blog/${p.slug}`);
      console.log(`Mapped ${blogRoutes.length} published blog articles.`);
    }
  } catch (err) {
    console.warn('Blog API fetch failed, checking local fallback...', err.message);
  }

  // 3. Fetch Products
  let productRoutes = [];
  try {
    console.log(`Fetching products from API: ${API_URL}/products`);
    const response = await fetch(`${API_URL}/products?limit=1000`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const products = await response.json();
    console.log(`Found ${products.length} products to map.`);
    
    productRoutes = products.map(p => `/product/${slugify(p.title)}`);
  } catch (err) {
    console.warn('API fetch failed during sitemap generation. Falling back to local products_metadata.json if available...', err);
    const localJsonPath = path.join(__dirname, '../public/products_metadata.json');
    if (fs.existsSync(localJsonPath)) {
      try {
        const localData = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));
        if (Array.isArray(localData)) {
          productRoutes = localData.map(p => `/product/${slugify(p.title)}`);
          console.log(`Successfully mapped ${productRoutes.length} products from local products_metadata.json.`);
        }
      } catch (jsonErr) {
        console.error('Failed to parse local products_metadata.json:', jsonErr);
      }
    }
    
    if (productRoutes.length === 0) {
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
  }

  const allRoutes = Array.from(new Set([...staticRoutes, ...categoryRoutes, ...blogRoutes, ...productRoutes]));

  const xmlEntries = allRoutes.map(route => {
    // Determine priority
    let priority = '0.5';
    let changefreq = 'monthly';

    if (route === '') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (route === '/shop' || route === '/categories' || route === '/blogs') {
      priority = '0.8';
      changefreq = 'daily';
    } else if (route.startsWith('/blog/')) {
      priority = '0.8';
      changefreq = 'weekly';
    } else if (route.startsWith('/category/')) {
      priority = '0.7';
      changefreq = 'weekly';
    } else if (route.startsWith('/product/')) {
      priority = '0.7';
      changefreq = 'weekly';
    } else if (route === '/tower-orders') {
      priority = '0.6';
      changefreq = 'weekly';
    }

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

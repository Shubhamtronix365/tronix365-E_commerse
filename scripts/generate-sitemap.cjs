const fs = require('fs');
const path = require('path');

// Native zero-dependency environment loader
function loadEnv(filePath) {
  if (fs.existsSync(filePath)) {
    const lines = fs.readFileSync(filePath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

loadEnv(path.resolve(__dirname, '../.env.production'));
loadEnv(path.resolve(__dirname, '../.env'));

// Configuration
const BASE_URL = 'https://www.tronix365.in/e-commerse';
const API_URL = process.env.VITE_API_URL || process.env.API_URL || 'http://localhost:8000';

// Ensure BASE_URL has trailing slash for consistency
const BASE_URL_WITH_SLASH = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;

// Current date for lastmod
const getCurrentDate = () => new Date().toISOString().split('T')[0];

const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&amp;/g, '')
    .replace(/&/g, '')
    .replace(/_/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

const xmlEscape = (str) => {
  if (!str) return '';
  return str
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

const resolveImageUrl = (rawImg) => {
  if (!rawImg || typeof rawImg !== 'string') return null;
  const trimmed = rawImg.trim();
  if (!trimmed || trimmed.startsWith('data:image')) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://www.tronix365.in${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
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
  console.log('Generating Sitemap.xml with Google Image Sitemap schema...');

  const routeMap = new Map();

  // Static routes
  staticRoutes.forEach(r => {
    let priority = '0.5';
    let changefreq = 'monthly';
    if (r === '') {
      priority = '1.0';
      changefreq = 'daily';
    } else if (['/shop', '/categories', '/blogs'].includes(r)) {
      priority = '0.8';
      changefreq = 'daily';
    } else if (r === '/tower-orders') {
      priority = '0.6';
      changefreq = 'weekly';
    }
    routeMap.set(r, { route: r, priority, changefreq, lastmod: getCurrentDate() });
  });

  // 1. Fetch Categories
  try {
    console.log(`Fetching categories from API: ${API_URL}/categories`);
    const catRes = await fetch(`${API_URL}/categories`);
    if (catRes.ok) {
      const cats = await catRes.json();
      if (Array.isArray(cats) && cats.length > 0) {
        cats.forEach(c => {
          const catSlug = slugify(typeof c === 'string' ? c : c.name || c.category);
          const r = `/category/${catSlug}`;
          routeMap.set(r, { route: r, priority: '0.7', changefreq: 'weekly', lastmod: getCurrentDate() });
        });
        console.log(`Mapped categories from API.`);
      }
    }
  } catch (err) {
    console.warn('Categories API fetch failed, using fallback category list...', err.message);
    fallbackCategories.forEach(c => {
      const r = `/category/${c}`;
      routeMap.set(r, { route: r, priority: '0.7', changefreq: 'weekly', lastmod: getCurrentDate() });
    });
  }

  // 2. Fetch Blog Posts
  try {
    console.log(`Fetching published blog posts from API: ${API_URL}/blogs?limit=1000`);
    const blogRes = await fetch(`${API_URL}/blogs?limit=1000`);
    if (blogRes.ok) {
      const blogData = await blogRes.json();
      const articles = Array.isArray(blogData) ? blogData : (blogData.posts || []);
      const published = articles.filter(p => p.is_published !== false && p.slug);
      published.forEach(p => {
        const r = `/blog/${p.slug}`;
        routeMap.set(r, {
          route: r,
          priority: '0.8',
          changefreq: 'weekly',
          title: p.title,
          image: p.cover_image || p.image || p.thumbnail,
          lastmod: p.updated_at ? p.updated_at.split('T')[0] : getCurrentDate()
        });
      });
      console.log(`Mapped ${published.length} published blog articles.`);
    }
  } catch (err) {
    console.warn('Blog API fetch failed, checking local fallback...', err.message);
  }

  // 3. Fetch Products
  try {
    console.log(`Fetching products from API: ${API_URL}/products`);
    const response = await fetch(`${API_URL}/products?limit=1000`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const products = await response.json();
    console.log(`Found ${products.length} products to map.`);
    
    products.forEach(p => {
      const slug = p.slug || slugify(p.title);
      let img = p.image;
      if (!img && Array.isArray(p.images) && p.images.length > 0) {
        img = typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url;
      }
      const r = `/product/${slug}`;
      routeMap.set(r, {
        route: r,
        priority: '0.7',
        changefreq: 'weekly',
        title: p.title,
        image: img,
        lastmod: p.updated_at ? p.updated_at.split('T')[0] : getCurrentDate()
      });
    });
  } catch (err) {
    console.warn('API fetch failed during sitemap generation. Falling back to local products_metadata.json if available...', err);
    const localJsonPath = path.join(__dirname, '../public/products_metadata.json');
    if (fs.existsSync(localJsonPath)) {
      try {
        const localData = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));
        if (Array.isArray(localData)) {
          localData.forEach(p => {
            const slug = p.slug || slugify(p.title);
            let img = p.image;
            if (!img && Array.isArray(p.images) && p.images.length > 0) {
              img = typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url;
            }
            const r = `/product/${slug}`;
            routeMap.set(r, {
              route: r,
              priority: '0.7',
              changefreq: 'weekly',
              title: p.title,
              image: img,
              lastmod: getCurrentDate()
            });
          });
          console.log(`Successfully mapped products from local products_metadata.json.`);
        }
      } catch (jsonErr) {
        console.error('Failed to parse local products_metadata.json:', jsonErr);
      }
    }
  }

  const xmlEntries = Array.from(routeMap.values()).map(entry => {
    const route = entry.route;
    const formattedRoute = route === '' ? '' : route;
    const fullUrl = `${BASE_URL_WITH_SLASH}${formattedRoute.replace(/^\//, '')}`;
    
    let imageXml = '';
    const imgUrl = resolveImageUrl(entry.image);
    if (imgUrl) {
      imageXml = `\n    <image:image>\n      <image:loc>${xmlEscape(imgUrl)}</image:loc>${entry.title ? `\n      <image:title>${xmlEscape(entry.title)}</image:title>` : ''}\n    </image:image>`;
    }

    return `  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${entry.lastmod || getCurrentDate()}</lastmod>
    <changefreq>${entry.changefreq || 'weekly'}</changefreq>
    <priority>${entry.priority || '0.5'}</priority>${imageXml}
  </url>`;
  }).join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
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
  
  // Create sitemap index for better organization
  const sitemapIndexXml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL_WITH_SLASH}sitemap.xml</loc>
    <lastmod>${getCurrentDate()}</lastmod>
  </sitemap>
</sitemapindex>`;
  
  fs.writeFileSync(path.join(publicDir, 'sitemap_index.xml'), sitemapIndexXml, 'utf8');
  console.log(`Sitemap index written to ${path.join(publicDir, 'sitemap_index.xml')}`);
  
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'sitemap_index.xml'), sitemapIndexXml, 'utf8');
    console.log(`Sitemap index also written to ${path.join(distDir, 'sitemap_index.xml')}`);
  }
}

generate().catch(console.error);

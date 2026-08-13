import React from 'react';

// Helper to determine if image is a placeholder or empty
const isPlaceholderImage = (img) => {
  if (!img) return true;
  return img.includes('placehold.co') || img.includes('No+Image') || img.includes('No Image') || img.startsWith('data:');
};

const jsGenerateDescription = (title, category) => {
  const voltageMatch = title ? title.match(/(\d+(?:\.\d+)?)\s*[Vv]\b/) : null;
  const voltageStr = voltageMatch ? `operating at a stable ${voltageMatch[0]}` : "with standard operating voltage";
  const cat = category || "Electronics";
  let desc = `The ${title || 'product'} is a professional-grade ${cat.toLowerCase()} component ${voltageStr}, designed for reliable and high-performance electronics prototyping.`;
  if (cat === "Development Boards") {
    desc += " Ideal for custom IoT systems, microcontroller programming, and smart home automation projects.";
  } else if (cat === "Sensors") {
    desc += " Perfect for real-time environment monitoring, telemetry collection, and robotic sensory inputs.";
  } else if (cat === "Modules") {
    desc += " Engineered for clean breadboard integration, wireless communication routing, or device expansion setups.";
  } else {
    desc += " Perfect for student learning labs, custom PCB designs, and advanced DIY electronics experiments.";
  }
  return desc;
};

const ProductSchema = ({
  name,
  description,
  image,
  price,
  sku,
  category,
  inStock = true,
  url,
}) => {
  // Clean name for SKU generation
  const cleanSKU = sku || (name ? `TRX-${(category || 'MSC').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3)}-${name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')}` : '');
  const cleanDescription = (description && description.trim().length >= 30) ? description : jsGenerateDescription(name, category);

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': name,
    'description': cleanDescription,
    'category': category,
    'sku': cleanSKU,
    'brand': {
      '@type': 'Brand',
      'name': 'Tronix365',
    },
    'offers': {
      '@type': 'Offer',
      'url': url || window.location.href,
      'priceCurrency': 'INR',
      'price': price,
      'itemCondition': 'https://schema.org/NewCondition',
      'availability': inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  // Always include image (using fallback store logo if placeholder) to comply with Google Search rules
  const fallbackImage = 'https://www.tronix365.in/e-commerse/Tronix3650final_circular.png';
  schema.image = isPlaceholderImage(image) ? fallbackImage : image;

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
};

export default ProductSchema;

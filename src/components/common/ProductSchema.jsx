import React from 'react';

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
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    'name': name,
    'description': description,
    'image': image,
    'category': category,
    'sku': sku || `SKU-${name.toUpperCase().replace(/[^A-Z0-9]/g, '-')}`,
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

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
};

export default ProductSchema;

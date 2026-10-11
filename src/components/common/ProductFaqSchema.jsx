import React from 'react';

/**
 * Generates an FAQPage JSON-LD schema dynamically for products to maximize visibility
 * in AI Answer Engines (ChatGPT, Perplexity, Claude, Google AI Overviews) and Google Rich Results.
 */
const ProductFaqSchema = ({ product }) => {
  if (!product || !product.title) return null;

  const appText = Array.isArray(product.applications) && product.applications.length > 0
    ? product.applications.join(', ')
    : 'Electronics prototyping, IoT development, robotics kits, automation projects, and university engineering labs';

  const pkgList = Array.isArray(product.package_includes) && product.package_includes.length > 0
    ? product.package_includes.filter(i => !/manual|guide/i.test(i)).join(', ')
    : `1x ${product.title}`;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': [
      {
        '@type': 'Question',
        'name': `Where can I buy genuine ${product.title} in India?`,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': `You can buy genuine ${product.title} online at Tronix365 (https://www.tronix365.in/e-commerse/) for ₹${product.price} with guaranteed authentic quality, technical support, and fast dispatch across India.`
        }
      },
      {
        '@type': 'Question',
        'name': `Is same-day delivery available for ${product.title} in Pune?`,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': `Yes! Tronix365 offers same-day express delivery in Pune (all 411xxx pincodes) for orders placed before 2 PM. Standard and express courier shipping across other Indian states takes 2 to 4 business days.`
        }
      },
      {
        '@type': 'Question',
        'name': `What are the primary applications of ${product.title}?`,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': `The ${product.title} is commonly used for: ${appText}.`
        }
      },
      {
        '@type': 'Question',
        'name': `What is included in the package for ${product.title}?`,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': `Package includes: ${pkgList}.`
        }
      },
      {
        '@type': 'Question',
        'name': `Can I place bulk or GST B2B orders for ${product.title}?`,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': `Yes, Tronix365 supports bulk B2B procurement, GST tax invoices (18% input credit), and institutional supply for colleges, startups, and manufacturers.`
        }
      }
    ]
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(faqSchema)}
    </script>
  );
};

export default ProductFaqSchema;

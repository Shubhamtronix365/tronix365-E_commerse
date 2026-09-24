import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  keywords,
  image,
  url,
  canonicalUrl,
  type = 'website',
  brand = 'Tronix365',
  noindex = false,
}) => {
  const defaultTitle = 'Tronix365 | Premium Electronic Components & IoT Modules India';
  const defaultDesc = 'Shop genuine Arduino boards, ESP32 modules, sensors, motors, robotics kits, and IoT devices at best prices in India. Fast delivery and 24/7 support for electronics enthusiasts.';
  const defaultKeywords = 'electronics, Arduino, ESP32, Sensors, Robotics, IoT Modules, Microcontrollers, India, online electronics store, electronic components, development boards';
  const defaultUrl = 'https://www.tronix365.in/e-commerse/';
  const defaultImage = 'https://www.tronix365.in/e-commerse/Tronix3650final_circular.png';

  const getAutoCanonicalUrl = () => {
    // Always prefer explicitly passed canonical URL
    if (canonicalUrl) return canonicalUrl;
    if (url) return url;
    
    // Auto-generate canonical URL based on current location
    if (typeof window !== 'undefined' && window.location) {
      let p = window.location.pathname.replace(/\/+$/, '');
      
      // Handle root and subdirectory consistently
      if (p === '' || p === '/e-commerse' || p === '/e-commerse/') {
        return 'https://www.tronix365.in/e-commerse/';
      }
      
      // Ensure consistent subdirectory handling
      if (!p.startsWith('/e-commerse')) {
        p = `/e-commerse${p}`;
      }
      
      // Remove trailing slash for consistency (except root)
      if (p !== '/e-commerse' && p.endsWith('/')) {
        p = p.replace(/\/$/, '');
      }
      
      return `https://www.tronix365.in${p}`;
    }
    
    return defaultUrl;
  };

  const seoTitle = title ? `${title} | ${brand}` : defaultTitle;
  const seoDescription = description || defaultDesc;
  const seoKeywords = keywords || defaultKeywords;
  const seoUrl = getAutoCanonicalUrl();
  const seoImage = image || defaultImage;

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
      <meta name="robots" content={noindex ? "noindex, nofollow" : "index, follow"} />
      <link rel="canonical" href={seoUrl} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={seoUrl} />
      <meta property="og:image" content={seoImage} />
      <meta property="og:site_name" content={brand} />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />
      
      {/* Additional SEO Tags */}
      <meta name="theme-color" content="#6366f1" />
      
      {/* JSON-LD Structured Data for Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Tronix365",
          "url": "https://www.tronix365.in/e-commerse/",
          "logo": "https://www.tronix365.in/e-commerse/Tronix3650final_circular.png",
          "description": "Premium electronic components, Arduino boards, ESP32 modules, sensors, and IoT devices",
          "address": {
            "@type": "PostalAddress",
            "addressCountry": "IN"
          },
          "contactPoint": {
            "@type": "ContactPoint",
            "contactType": "customer service",
            "areaServed": "IN",
            "availableLanguage": "English"
          }
        })}
      </script>
    </Helmet>
  );
};

export default SEO;

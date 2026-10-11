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
      
      {/* JSON-LD Structured Data for Organization, LocalBusiness (GEO), and WebSite SearchAction (AEO) */}
      <script type="application/ld+json">
        {JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": ["ElectronicsStore", "Organization", "OnlineBusiness"],
            "@id": "https://www.tronix365.in/e-commerse/#organization",
            "name": "Tronix365",
            "legalName": "Tronix365 Electronics",
            "url": "https://www.tronix365.in/e-commerse/",
            "logo": "https://www.tronix365.in/e-commerse/Tronix3650final_circular.png",
            "image": "https://www.tronix365.in/e-commerse/Tronix3650final_circular.png",
            "description": "Leading electronics component supplier in Pune, India. Specializing in Arduino, ESP32, sensors, robotics kits, IoT modules with same-day delivery in Pune and express nationwide shipping.",
            "telephone": "+918830153805",
            "email": "shubham.tronix365@gmail.com",
            "priceRange": "₹",
            "address": {
              "@type": "PostalAddress",
              "streetAddress": "Kothrud",
              "addressLocality": "Pune",
              "addressRegion": "Maharashtra",
              "postalCode": "411038",
              "addressCountry": "IN"
            },
            "geo": {
              "@type": "GeoCoordinates",
              "latitude": 18.5074,
              "longitude": 73.8077
            },
            "areaServed": [
              {
                "@type": "City",
                "name": "Pune"
              },
              {
                "@type": "AdministrativeArea",
                "name": "Maharashtra"
              },
              {
                "@type": "Country",
                "name": "India"
              }
            ],
            "sameAs": [
              "https://www.instagram.com/tronix365",
              "https://www.linkedin.com/company/tronix365/",
              "https://wa.me/8830153805"
            ],
            "contactPoint": {
              "@type": "ContactPoint",
              "telephone": "+918830153805",
              "contactType": "customer service",
              "areaServed": "IN",
              "availableLanguage": ["English", "Hindi", "Marathi"]
            }
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            "@id": "https://www.tronix365.in/e-commerse/#website",
            "url": "https://www.tronix365.in/e-commerse/",
            "name": "Tronix365",
            "publisher": {
              "@id": "https://www.tronix365.in/e-commerse/#organization"
            },
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://www.tronix365.in/e-commerse/shop?search={search_term_string}"
              },
              "query-input": "required name=search_term_string"
            }
          }
        ])}
      </script>
    </Helmet>
  );
};

export default SEO;

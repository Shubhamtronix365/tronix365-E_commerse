import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  brand = 'Tronix365',
}) => {
  const defaultTitle = 'Tronix365 | Premium Electronic Components';
  const defaultDesc = 'Shop high-quality Arduino boards, sensors, ESP32 modules, robotics parts, and IoT devices at Tronix365.';
  const defaultKeywords = 'electronics, Arduino, ESP32, Sensors, Robotics, IoT Modules, Microcontrollers';
  const defaultUrl = 'https://www.tronix365.in/e-commerse/';
  const defaultImage = 'https://www.tronix365.in/e-commerse/Tronix3650final_circular.png';

  const seoTitle = title ? `${title} | ${brand}` : defaultTitle;
  const seoDescription = description || defaultDesc;
  const seoKeywords = keywords || defaultKeywords;
  const seoUrl = url || defaultUrl;
  const seoImage = image || defaultImage;

  return (
    <Helmet>
      {/* Standard Meta Tags */}
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="keywords" content={seoKeywords} />
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
    </Helmet>
  );
};

export default SEO;

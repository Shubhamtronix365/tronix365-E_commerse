import React, { useState } from 'react';

const Image = ({
  src,
  alt,
  title,
  className = '',
  width,
  height,
  loading = 'lazy',
  ...props
}) => {
  const [error, setError] = useState(false);

  // Generate automated alt text if missing, using the product title
  const generateAlt = () => {
    if (alt) return alt;
    if (title) return `${title} - Tronix365 electronics component`;
    return 'Electronics component - Tronix365';
  };

  // Safe fallback image if loading fails
  const fallbackSrc = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="%231a1921"/><rect width="90%" height="90%" x="5%" y="5%" rx="20" fill="%230f0e13" stroke="%233f3e46" stroke-width="2"/><path d="M150 140 A 10 10 0 1 1 130 140 A 10 10 0 1 1 150 140" fill="%23a78bfa"/><path d="M80 300 L180 200 L260 270 L320 220 L350 250" stroke="%23a78bfa" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="50%" y="82%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="600" fill="%239ca3af">No Image Available</text></svg>`;

  return (
    <img
      src={error ? fallbackSrc : src}
      alt={generateAlt()}
      width={width}
      height={height}
      loading={loading}
      className={`transition-all duration-300 ${className}`}
      onError={() => setError(true)}
      {...props}
    />
  );
};

export default Image;

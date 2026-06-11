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
  const fallbackSrc = 'https://images.unsplash.com/photo-1553406830-ef2513450d76?auto=format&fit=crop&q=80&w=400';

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

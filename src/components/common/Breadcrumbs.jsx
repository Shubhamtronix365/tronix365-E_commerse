import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { slugify } from '../../utils/slugify';

const Breadcrumbs = ({ category, productName }) => {
  const baseUrl = 'https://www.tronix365.in/e-commerse';

  // Generate breadcrumb items
  const items = [
    { name: 'Home', url: '/' },
  ];

  if (category) {
    items.push({
      name: category,
      url: `/category/${slugify(category)}`,
    });
  }

  if (productName) {
    items.push({
      name: productName,
      url: window.location.pathname,
    });
  }

  // Construct JSON-LD schema
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => ({
      '@type': 'ListItem',
      'position': index + 1,
      'name': item.name,
      'item': `${baseUrl}${item.url}`,
    })),
  };

  return (
    <nav aria-label="Breadcrumb" className="mb-6 flex flex-col gap-2">
      {/* UI Elements */}
      <ol className="flex flex-wrap items-center gap-2 text-sm text-gray-400 bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 backdrop-blur-md max-w-fit">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <React.Fragment key={index}>
              {index > 0 && <ChevronRight size={14} className="text-gray-600 shrink-0" />}
              <li className="flex items-center">
                {isLast ? (
                  <span className="text-tronix-primary font-medium truncate max-w-[200px] sm:max-w-none">
                    {item.name}
                  </span>
                ) : (
                  <Link
                    to={item.url}
                    className="flex items-center gap-1 hover:text-white transition-colors duration-150"
                  >
                    {index === 0 && <Home size={14} className="shrink-0" />}
                    <span>{item.name}</span>
                  </Link>
                )}
              </li>
            </React.Fragment>
          );
        })}
      </ol>

      {/* Schema Injection */}
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
    </nav>
  );
};

export default Breadcrumbs;

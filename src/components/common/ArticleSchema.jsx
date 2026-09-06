import React from 'react';

const ArticleSchema = ({
    title,
    description,
    image,
    datePublished,
    dateModified,
    authorName = 'Tronix365 Engineering Team',
    authorRole = 'Hardware Research & Development',
    category = 'Tutorial',
    tags = [],
    slug,
    url,
}) => {
    const canonicalUrl =
        url ||
        `https://www.tronix365.in/e-commerse/blog/${slug || ''}`;

    const defaultImage = 'https://www.tronix365.in/e-commerse/Tronix3650final_circular.png';
    const articleImage = image || defaultImage;

    const schema = {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        'headline': title,
        'description': description,
        'image': [articleImage],
        'datePublished': datePublished || new Date().toISOString(),
        'dateModified': dateModified || datePublished || new Date().toISOString(),
        'articleSection': category,
        'keywords': tags && tags.length > 0 ? tags.join(', ') : 'electronics, engineering, IoT, Arduino',
        'mainEntityOfPage': {
            '@type': 'WebPage',
            '@id': canonicalUrl,
        },
        'author': {
            '@type': 'Person',
            'name': authorName || 'Tronix365 Author',
            'jobTitle': authorRole || 'Author',
        },
        'publisher': {
            '@type': 'Organization',
            'name': 'Tronix365 Technologies Pvt. Ltd.',
            'logo': {
                '@type': 'ImageObject',
                'url': 'https://www.tronix365.in/e-commerse/Tronix3650final_circular.png',
            },
        },
    };

    return (
        <script type="application/ld+json">
            {JSON.stringify(schema)}
        </script>
    );
};

export default ArticleSchema;

/**
 * Helper utility to construct full image URLs from paths.
 * If the path is already an absolute URL (http:// or https://), it returns it as is.
 * If the path is a relative path (e.g., /uploads/...), it prepends the backend base URL.
 */
export const getImageUrl = (imagePath) => {
    // Return null instead of empty string to prevent React <img> src="" warnings
    if (!imagePath) return null;

    // Return a gorgeous local SVG placeholder if placehold.co or No Image is requested
    if (imagePath.includes('placehold.co') || imagePath.includes('No+Image')) {
        return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><rect width="100%" height="100%" fill="%231a1921"/><rect width="90%" height="90%" x="5%" y="5%" rx="20" fill="%230f0e13" stroke="%233f3e46" stroke-width="2"/><path d="M150 140 A 10 10 0 1 1 130 140 A 10 10 0 1 1 150 140" fill="%23a78bfa"/><path d="M80 300 L180 200 L260 270 L320 220 L350 250" stroke="%23a78bfa" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"/><text x="50%" y="82%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="600" fill="%239ca3af">No Image Available</text></svg>`;
    }

    // If it's an external URL or data URI, return as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://') || imagePath.startsWith('data:')) {
        return imagePath;
    }

    // Treat it as a path relative to the backend
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // Ensure smooth concatenation
    if (imagePath.startsWith('/')) {
        return `${backendUrl}${imagePath}`;
    }
    return `${backendUrl}/${imagePath}`;
};

/**
 * High-definition hardware-themed fallback image for blog articles when cover or in-article
 * images are unavailable or fail to load.
 */
export const FALLBACK_BLOG_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><defs><linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%230f172a"/><stop offset="100%" stop-color="%23020617"/></linearGradient><linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="%2310b981"/><stop offset="100%" stop-color="%2306b6d4"/></linearGradient></defs><rect width="100%" height="100%" fill="url(%23bg)"/><rect width="96%" height="93%" x="2%" y="3.5%" rx="16" fill="%231e293b" stroke="%23334155" stroke-width="1.5"/><circle cx="400" cy="190" r="46" fill="%2310b981" opacity="0.12"/><path d="M375 190 L425 190 M400 165 L400 215" stroke="%2310b981" stroke-width="3.5" stroke-linecap="round"/><text x="50%" y="65%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="16" font-weight="700" fill="url(%23glow)">TRONIX365 ENGINEERING</text><text x="50%" y="74%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="12" font-weight="400" fill="%2394a3b8">Hardware Guides &amp; Research</text></svg>`;

/**
 * Formats HTML content of blog articles so that all relative media URLs (/uploads/...)
 * are automatically rewritten with the full backend URL, ensuring they render correctly
 * on both development (localhost:5173) and production deployments.
 */
export const formatBlogHtml = (htmlContent) => {
    if (!htmlContent || typeof htmlContent !== 'string') return '';
    const backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    return htmlContent
        .replace(
            /src=["'](\/uploads\/[^"']+)["']/g,
            (match, path) => `src="${backendUrl}${path}" onerror="this.onerror=null; this.src='${FALLBACK_BLOG_IMAGE}';"`
        )
        .replace(/poster=["'](\/uploads\/[^"']+)["']/g, (match, path) => `poster="${backendUrl}${path}"`);
};

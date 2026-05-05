/**
 * Helper utility to construct full image URLs from paths.
 * If the path is already an absolute URL (http:// or https://), it returns it as is.
 * If the path is a relative path (e.g., /uploads/...), it prepends the backend base URL.
 */
export const getImageUrl = (imagePath) => {
    // Return null instead of empty string to prevent React <img> src="" warnings
    if (!imagePath) return null;

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

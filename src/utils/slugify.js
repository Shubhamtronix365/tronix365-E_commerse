export const slugify = (text) => {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/&amp;/g, '')         // Remove HTML entity &amp;
    .replace(/&/g, '')             // Remove &
    .replace(/\./g, '-')          // Replace dots with - (preserves decimals like 4.7K vs 47K)
    .replace(/_/g, '-')           // Replace underscores with -
    .replace(/\s+/g, '-')         // Replace spaces with -
    .replace(/[^\w\-]+/g, '')     // Remove all non-word chars
    .replace(/\-\-+/g, '-')       // Replace multiple - with single -
    .replace(/^-+/, '')           // Trim - from start
    .replace(/-+$/, '');          // Trim - from end
};

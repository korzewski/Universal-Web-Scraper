/**
 * Extracts URL path as a slug, removing leading/trailing slashes
 * 
 * Usage: "slugFromUrl"
 * Input: "https://example.com/blog/my-post/" → Output: "blog/my-post"
 * Input: "/products/shoes" → Output: "products/shoes"
 */
export default function slugFromUrl(value) {
  if (typeof value !== 'string') return value;
  
  try {
    const url = new URL(value);
    return url.pathname.replace(/^\//, '').replace(/\/$/, '');
  } catch {
    return value.replace(/^\//, '').replace(/\/$/, '') || value;
  }
}
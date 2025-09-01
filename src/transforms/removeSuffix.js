/**
 * Removes a specific suffix from the end of a string
 * 
 * Usage: "removeSuffix( home delivery)" or "removeSuffix(Suffix)"
 * Input: "Product 1 home delivery" → Output: "Product 1"
 * Input: "Amazing Product 2 home delivery" → Output: "Amazing Product 2"
 */
export default function removeSuffix(value, suffix) {
  if (typeof value !== 'string' || !suffix) return value;
  
  // Remove suffix if it exists at the end, then trim whitespace
  if (value.endsWith(suffix)) {
    return value.slice(0, -suffix.length).trim();
  }
  
  return value;
}
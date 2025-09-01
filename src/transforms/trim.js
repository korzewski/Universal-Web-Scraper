/**
 * Removes whitespace from the beginning and end of a string
 * 
 * Usage: "trim"
 * Input: "  hello world  " → Output: "hello world"
 */
export default function trim(value) {
  if (typeof value !== 'string') return value;
  return value.trim();
}
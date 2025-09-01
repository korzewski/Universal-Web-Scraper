/**
 * Converts string to uppercase
 * 
 * Usage: "uppercase"
 * Input: "hello world" → Output: "HELLO WORLD"
 */
export default function uppercase(value) {
  if (typeof value !== 'string') return value;
  return value.toUpperCase();
}
/**
 * Converts string to lowercase
 * 
 * Usage: "lowercase"  
 * Input: "Hello World" → Output: "hello world"
 */
export default function lowercase(value) {
  if (typeof value !== 'string') return value;
  return value.toLowerCase();
}
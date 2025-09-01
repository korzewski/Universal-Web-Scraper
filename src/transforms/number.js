/**
 * Extracts and parses a number from a string, removing non-numeric characters
 * 
 * Usage: "number"
 * Input: "$29.99" → Output: 29.99
 * Input: "Price: $1,234.56 USD" → Output: 1234.56
 */
export default function number(value) {
  if (typeof value !== 'string') return value;
  
  const num = parseFloat(value.replace(/[^0-9.-]/g, ''));
  return isNaN(num) ? value : num;
}
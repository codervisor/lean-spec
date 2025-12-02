import fetch from 'node-fetch';

/**
 * Convert currency
 * 
 * PROBLEM: Duplicates HTTP logic from weatherService
 * - Same fetch boilerplate
 * - Same error handling pattern
 * - Same JSON parsing
 * - Should be using a shared HTTP client!
 */
export async function convertCurrency(amount, from, to) {
  // Mock API endpoint (replace with real API in production)
  const url = `https://api.exchangerate.host/convert?from=${from}&to=${to}&amount=${amount}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Currency API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Business logic: Transform API response to our format
    return {
      amount,
      from,
      to,
      converted: data.result || (amount * 0.85).toFixed(2),
      rate: data.info?.rate || 0.85,
    };
  } catch (error) {
    // For demo, return mock data on error
    return {
      amount,
      from,
      to,
      converted: (amount * 0.85).toFixed(2),
      rate: 0.85,
    };
  }
}

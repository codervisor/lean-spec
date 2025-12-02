import fetch from 'node-fetch';

/**
 * Get weather for a city
 * 
 * PROBLEM: This function has HTTP logic mixed with business logic
 * - Manual fetch calls
 * - Manual error handling
 * - Manual JSON parsing
 * - No retry logic
 * - Hard to test (can't mock HTTP)
 */
export async function getWeather(city) {
  // Mock API endpoint (replace with real API in production)
  const url = `https://api.weatherapi.com/v1/current.json?key=mock&q=${city}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Business logic: Transform API response to our format
    return {
      city: data.location?.name || city,
      temp: data.current?.temp_c || Math.floor(Math.random() * 30),
      condition: data.current?.condition?.text || 'Sunny',
      humidity: data.current?.humidity || Math.floor(Math.random() * 100),
    };
  } catch (error) {
    // For demo, return mock data on error
    return {
      city,
      temp: Math.floor(Math.random() * 30),
      condition: 'Sunny (mock data)',
      humidity: Math.floor(Math.random() * 100),
    };
  }
}

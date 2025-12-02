import fetch from 'node-fetch';

/**
 * Get timezone information
 * 
 * PROBLEM: Yet another copy of the same HTTP logic!
 * - Third time we're writing fetch + error handling + JSON parsing
 * - Violates DRY principle
 * - Makes testing hard (need to mock fetch in 3 places)
 * - Changes to HTTP logic need updates in 3 files
 */
export async function getTimezone(zone) {
  // Mock API endpoint (replace with real API in production)
  const url = `http://worldtimeapi.org/api/timezone/${zone}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Timezone API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Business logic: Transform API response to our format
    return {
      name: data.timezone || zone,
      offset: data.utc_offset || '-05:00',
      abbreviation: data.abbreviation || 'EST',
      datetime: data.datetime || new Date().toISOString(),
    };
  } catch (error) {
    // For demo, return mock data on error
    return {
      name: zone,
      offset: '-05:00',
      abbreviation: 'EST',
      datetime: new Date().toISOString(),
    };
  }
}

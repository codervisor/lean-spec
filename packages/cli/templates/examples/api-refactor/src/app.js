import { getWeather } from './services/weatherService.js';
import { convertCurrency } from './services/currencyService.js';
import { getTimezone } from './services/timezoneService.js';

console.log('=== Multi-Service App Demo ===\n');

// Demo 1: Weather lookup
console.log('1. Weather Lookup:');
try {
  const weather = await getWeather('London');
  console.log(`   ${weather.city}: ${weather.temp}°C, ${weather.condition}`);
} catch (error) {
  console.log(`   Error: ${error.message}`);
}

console.log('');

// Demo 2: Currency conversion
console.log('2. Currency Conversion:');
try {
  const result = await convertCurrency(100, 'USD', 'EUR');
  console.log(`   ${result.amount} ${result.from} = ${result.converted} ${result.to}`);
} catch (error) {
  console.log(`   Error: ${error.message}`);
}

console.log('');

// Demo 3: Timezone lookup
console.log('3. Timezone Lookup:');
try {
  const timezone = await getTimezone('America/New_York');
  console.log(`   ${timezone.name}: ${timezone.offset} (${timezone.abbreviation})`);
} catch (error) {
  console.log(`   Error: ${error.message}`);
}

console.log('');
console.log('Notice: All services work, but they all duplicate HTTP logic!');
console.log('Your task: Extract a reusable API client module.');

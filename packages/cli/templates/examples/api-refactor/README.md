# API Refactor Demo

> **Tutorial**: [Refactoring with Specs](https://leanspec.dev/docs/tutorials/refactoring-specs)

## Scenario

You're maintaining a Node.js application that started simple but has grown messy. The app integrates with multiple external services (weather API, currency converter, timezone lookup), but all the HTTP logic is tangled together in the main application code.

You want to extract a reusable API client module that:
- Centralizes HTTP request handling
- Provides a clean interface for service calls
- Handles errors consistently
- Makes the code easier to test and maintain

## What's Here

A monolithic Node.js app with:
- Weather lookup feature (calls external API)
- Currency conversion (calls external API)
- Timezone lookup (calls external API)
- All HTTP logic mixed into business logic (tight coupling)
- No error handling abstraction
- Hard to test individual parts

**Files:**
- `src/app.js` - Main application with all features
- `src/services/weatherService.js` - Weather API calls (tightly coupled)
- `src/services/currencyService.js` - Currency API calls (tightly coupled)
- `src/services/timezoneService.js` - Timezone API calls (tightly coupled)

## Getting Started

```bash
# Install dependencies
npm install

# Run the app
npm start

# Try the features:
# - Weather: Get weather for a city
# - Currency: Convert between currencies
# - Timezone: Look up timezone info
```

## Your Mission

Refactor the HTTP logic into a clean, reusable API client. Follow the tutorial and ask your AI assistant:

> "Help me refactor this app using LeanSpec. I want to extract a reusable API client module that centralizes all the HTTP logic."

The AI will guide you through:
1. Creating a refactoring spec
2. Designing the API client interface
3. Extracting the HTTP logic step by step
4. Updating services to use the new client
5. Verifying everything still works

## Current Problems

- **Duplicated code**: Each service reimplements HTTP requests
- **No error handling**: Errors handled inconsistently
- **Hard to test**: Can't mock HTTP calls easily
- **Tight coupling**: Business logic mixed with HTTP details
- **No retry logic**: Network failures aren't handled

These are perfect opportunities to practice refactoring with specs!

## Expected Result

After refactoring, you should have:
```
src/
  app.js (unchanged interface)
  client/
    apiClient.js (new - centralized HTTP logic)
  services/
    weatherService.js (simplified - uses apiClient)
    currencyService.js (simplified - uses apiClient)
    timezoneService.js (simplified - uses apiClient)
```

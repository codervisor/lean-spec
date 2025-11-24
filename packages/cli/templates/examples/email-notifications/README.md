# Email Notifications Demo

> **Tutorial**: [Your First Feature with AI](https://leanspec.dev/docs/tutorials/first-feature)

## Scenario

You're building a user management API. Currently, when users register, their data is stored but they don't receive any confirmation. You need to add email notifications to improve the user experience.

## What's Here

A minimal Express.js API with:
- User registration endpoint (`POST /users`)
- User listing endpoint (`GET /users`)
- In-memory data store (no database needed)
- Basic validation

**Files:**
- `src/server.js` - Express app with user routes
- `src/users.js` - User management logic
- `src/storage.js` - Simple in-memory storage

## Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm start

# In another terminal, try it out:
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name": "Alice", "email": "alice@example.com"}'
```

## Your Mission

Add email notifications when users register. Follow the tutorial and ask your AI assistant:

> "Help me add email notifications to this app using LeanSpec. When a user registers, send them a welcome email."

The AI will guide you through:
1. Creating a spec for the feature
2. Designing the email notification system
3. Implementing the code
4. Testing it works

## Current Limitations

- No email service configured (you'll add this)
- No retry logic for failed sends
- No email templates

These are perfect opportunities to practice spec-driven development!

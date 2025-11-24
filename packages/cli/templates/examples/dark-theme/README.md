# Dark Theme Demo

> **Tutorial**: [Adding Dark Theme Support](https://leanspec.dev/docs/tutorials/adding-dark-theme)

## Scenario

You're building a personal task manager web app. The app works great, but users keep requesting a dark mode option for late-night productivity sessions. Currently, the app only has a bright light theme that can strain eyes in low-light environments.

## What's Here

A minimal single-page task manager with:
- Task creation and listing interface
- Simple Express.js server serving static files
- Clean light theme CSS
- No dark mode support (yet!)

**Files:**
- `src/server.js` - Express server for static files
- `src/public/index.html` - Task manager interface
- `src/public/style.css` - Current light theme styles
- `src/public/app.js` - Task management logic

## Getting Started

```bash
# Install dependencies
npm install

# Start the server
npm start

# Open in your browser:
# http://localhost:3000
```

## Your Mission

Add dark theme support with automatic switching based on system preferences. Follow the tutorial and ask your AI assistant:

> "Help me add dark theme support to this app using LeanSpec. It should automatically switch based on the user's system theme preference."

The AI will guide you through:
1. Creating a spec for dark theme support
2. Designing the CSS for dark mode
3. Implementing system preference detection
4. Testing the theme switching

## Current Limitations

- Only light theme available
- No manual theme toggle
- Colors may not be fully accessible
- No theme persistence

These are perfect opportunities to practice spec-driven development!

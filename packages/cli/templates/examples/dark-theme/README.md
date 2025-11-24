# Dark Theme Demo

> **Tutorial**: [Adding Dark Theme Support](https://leanspec.dev/docs/tutorials/adding-dark-theme)

## Scenario

You're building a professional admin dashboard for a SaaS product. The dashboard looks modern and works great, but users keep requesting a dark mode option for late-night monitoring sessions and to reduce eye strain during extended use. Currently, the dashboard only has a bright light theme.

## What's Here

A professional admin dashboard with:
- Interactive data visualization with charts (Chart.js)
- Real-time statistics cards with animations
- Sidebar navigation and top bar
- Activity feed with recent events
- Responsive layout
- Clean, modern light theme
- No dark mode support (yet!)

**Files:**
- `src/server.js` - Express server for static files
- `src/public/index.html` - Dashboard interface with sidebar, charts, and stats
- `src/public/style.css` - Current light theme styles (CSS custom properties ready)
- `src/public/app.js` - Dashboard logic, chart initialization, and animations

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

> "Help me add dark theme support to this admin dashboard using LeanSpec. It should automatically switch based on the user's system theme preference."

The AI will guide you through:
1. Creating a spec for dark theme support
2. Designing CSS custom properties for dark mode colors
3. Implementing the `@media (prefers-color-scheme: dark)` query
4. Ensuring charts adapt to the theme
5. Testing the theme switching

## Current Limitations

- Only light theme available
- No manual theme toggle
- Chart colors don't adapt to theme
- No theme persistence across sessions

These are perfect opportunities to practice spec-driven development!

## Tech Stack

- **Frontend**: Vanilla HTML, CSS, JavaScript
- **Charts**: Chart.js 4.4.0
- **Backend**: Express.js (serving static files)
- **Styling**: CSS Custom Properties (CSS Variables)

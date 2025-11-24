# Dashboard Widgets Demo

> **Tutorial**: [Managing Multiple Features](https://leanspec.dev/docs/tutorials/multiple-features)

## Scenario

You're building an analytics dashboard for a SaaS product. The dashboard has some basic widgets (stats cards and a simple chart), but the product team wants to add three new widgets:
- **Recent Activity Feed** - Show latest user actions
- **Performance Metrics** - Display system health indicators  
- **Quick Actions Panel** - Common shortcuts for users

Each widget needs to be designed, implemented, and integrated into the dashboard grid.

## What's Here

A minimal React + Vite dashboard with:
- Grid layout for widgets
- Two existing widgets (Stats, Chart)
- Reusable widget wrapper component
- Mock data utilities

**Files:**
- `src/App.jsx` - Main dashboard component
- `src/components/Dashboard.jsx` - Dashboard grid layout
- `src/components/widgets/` - Existing widgets
- `src/utils/mockData.js` - Sample data generator
- `index.html` - Entry point

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Open http://localhost:5173 in your browser
```

## Your Mission

Add three new widgets to the dashboard. Follow the tutorial and ask your AI assistant:

> "Help me add three new widgets to this dashboard using LeanSpec: Recent Activity Feed, Performance Metrics, and Quick Actions Panel."

The AI will guide you through:
1. Creating specs for each widget (or one unified spec)
2. Designing the widget interfaces
3. Implementing components
4. Managing dependencies between widgets
5. Testing the integrated dashboard

## Current Structure

```
Dashboard
├── StatsWidget (implemented)
├── ChartWidget (implemented)
├── ActivityWidget (TODO)
├── MetricsWidget (TODO)
└── ActionsWidget (TODO)
```

## Tips

- Each widget is self-contained with its own component
- Widgets use the `WidgetWrapper` component for consistent styling
- Mock data is in `utils/mockData.js` - add new generators as needed
- Consider which widgets share dependencies (e.g., both might need user data)

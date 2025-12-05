# UI Design: Analytics Dashboard Redesign

> Sub-spec for packages/ui stats page and component updates

## Current State

The current `/stats` page shows:
- 4 summary cards (Total, Completed, In Progress, Planned)
- 2 pie charts (Status Distribution, Priority Distribution)
- Bar chart (Creation Trend by month)
- Top Tags list

**Problems**: Pie charts don't show trends, no velocity metrics, no actionable insights.

## Design

### 1. Dashboard Overview (Replace Current Stats Page)

```
┌─────────────────────────────────────────────────────────────────┐
│  ⚡ Project Health                                    [7 days ▾] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│
│  │ Health   │ │ Velocity │ │ WIP      │ │ Throughput           ││
│  │   82%    │ │  2.4h    │ │   5/8    │ │ ████████████ 12/wk ↑ ││
│  │   Good ✓ │ │  median  │ │   limit  │ │ +23% vs last week    ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────────┘│
│                                                                  │
│  ⚠️ Needs Attention (2)                              [View All] │
│  ├─ 🔴 spec-045 stuck 4 days → likely blocked                   │
│  └─ 🟡 6 specs on tag:api exceeds WIP                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Cumulative Flow Chart

Interactive stacked area chart (Recharts AreaChart):

```tsx
interface CumulativeFlowChartProps {
  data: {
    date: string;
    planned: number;
    inProgress: number;
    complete: number;
  }[];
  period: '7d' | '30d' | '90d';
  showWIPLine?: boolean;
  wipLimit?: number;
}
```

Features:
- Hover shows exact counts for each date
- Click area to filter specs by status on that date
- WIP limit line with violation highlighting
- Zoom/pan for longer periods

Visual:
```
     │ ████████████████████████████████████ Complete
 150 │ ████████████████████████░░░░░░░░░░░░ 
     │ ████████████████░░░░░░░░░░░░░░░░░░░░ In Progress
 100 │ ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ 
     │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Planned
  50 │ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─  WIP Limit (8)
     │
   0 └────────────────────────────────────────
       Nov 1    Nov 8    Nov 15   Nov 22   Nov 29
```

### 3. Cycle Time Histogram

Time buckets optimized for AI-era development:

```tsx
interface CycleTimeHistogramProps {
  specs: SpecWithTiming[];
  buckets: TimeBucket[];
  highlightBucket?: TimeBucket;
  comparison?: {
    label: string;
    data: SpecWithTiming[];
  };
}
```

Visual:
```
  ⏱️ Cycle Time Distribution

  < 30m   ████████████████████ 20 │ Trivial
  30m-1h  ██████████████ 14       │ Quick wins
  1-4h    ██████████████████ 18   │ ← AI sweet spot
  4-8h    ██████████ 10           │ Session work
  8-24h   ██████ 6                │ Day features
  1-3d    ████ 4                  │ Complex
  > 3d    ██ 2                    │ ⚠️ Investigate
          └─────────────────────────────────
          
  Median: 1.8h │ P90: 22h │ Trend: ↓ improving
```

### 4. Flow Efficiency Bar

Horizontal breakdown showing time allocation:

```tsx
interface FlowEfficiencyProps {
  metrics: {
    activeWork: number;    // minutes
    waiting: number;
    planning: number;
    review: number;
  };
  target?: { efficiency: number };
}
```

Visual:
```
  🔄 Flow Efficiency: 34%
  
  Active Work  ████████████████████████░░░░░░░░░░  4.2h (34%)
  Planning     ████████░░░░░░░░░░░░░░░░░░░░░░░░░░  1.2h (10%)
  Waiting      ██████████████████████████████████  6.8h (56%) ← bottleneck
               └────────────────────────────────────────────
```

### 5. Sparklines

Mini inline charts for summary cards:

```tsx
interface SparklineProps {
  data: number[];
  trend: 'up' | 'down' | 'stable';
  color?: string;
  height?: number;
}
```

Usage in cards:
```
┌──────────────┐
│ Throughput   │
│ 12/week  ↑   │
│ ▃▅▆▇▅▆█▇█▇  │
└──────────────┘
```

### 6. Insights Panel

Actionable recommendations with one-click actions:

```tsx
interface InsightCardProps {
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  specs: string[];
  action: {
    label: string;
    href: string;
  };
  dismissible?: boolean;
}
```

Visual:
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ 3 specs stuck > 3 days                          [Dismiss]│
├─────────────────────────────────────────────────────────────┤
│ These specs may be blocked or need scope reduction:         │
│                                                             │
│ • 045-unified-dashboard (4.2 days)  [View] [Mark Complete]  │
│ • 052-api-redesign (3.8 days)       [View] [Mark Complete]  │
│ • 067-auth-flow (3.1 days)          [View] [Mark Complete]  │
│                                                             │
│ 💡 Consider breaking these into smaller specs              │
└─────────────────────────────────────────────────────────────┘
```

### 7. Comparison View

Side-by-side period comparison (new page `/stats/compare`):

```
┌─────────────────────────────┬─────────────────────────────┐
│       This Week             │       Last Week             │
├─────────────────────────────┼─────────────────────────────┤
│ Completed: 12 specs         │ Completed: 9 specs          │
│ Median Cycle: 2.4h          │ Median Cycle: 3.8h          │
│ WIP Avg: 4.2                │ WIP Avg: 6.1                │
│ Flow Efficiency: 38%        │ Flow Efficiency: 29%        │
├─────────────────────────────┴─────────────────────────────┤
│                    Summary                                 │
│ ✓ Throughput up 33%    ✓ Cycle time down 37%              │
│ ✓ WIP reduced          ✓ Efficiency improved              │
└───────────────────────────────────────────────────────────┘
```

## Routes

```
/stats              → Dashboard overview (redesigned)
/stats/flow         → Cumulative flow diagram (full page)
/stats/velocity     → Cycle time distribution + trends
/stats/compare      → Period comparison view
/stats/insights     → All recommendations
```

## Component Structure

New components for `packages/ui/src/components`:

```
components/
├── charts/
│   ├── cumulative-flow-chart.tsx
│   ├── cycle-time-histogram.tsx
│   ├── flow-efficiency-bar.tsx
│   ├── sparkline.tsx
│   └── trend-indicator.tsx
├── insights/
│   ├── insight-card.tsx
│   ├── insights-panel.tsx
│   └── recommendation-action.tsx
├── stats/
│   ├── health-score-badge.tsx
│   ├── metric-card.tsx
│   ├── period-selector.tsx
│   └── comparison-table.tsx
└── velocity/
    ├── time-bucket-badge.tsx
    ├── velocity-summary.tsx
    └── wip-indicator.tsx
```

## Implementation Phases

### Phase 7: UI - Chart Components
- [ ] Create `cumulative-flow-chart.tsx` with Recharts AreaChart
- [ ] Create `cycle-time-histogram.tsx` with bucket visualization
- [ ] Create `flow-efficiency-bar.tsx` horizontal breakdown
- [ ] Create `sparkline.tsx` for inline trends
- [ ] Create `trend-indicator.tsx` (↑/↓/→ with color)

### Phase 8: UI - Insights & Actions
- [ ] Create `insight-card.tsx` with severity styling
- [ ] Create `insights-panel.tsx` aggregating recommendations
- [ ] Add one-click actions (view, mark complete, dismiss)
- [ ] Create `health-score-badge.tsx` with color coding

### Phase 9: UI - Stats Page Redesign
- [ ] Redesign `/stats` page with new dashboard layout
- [ ] Replace pie charts with cumulative flow
- [ ] Add velocity summary cards with sparklines
- [ ] Integrate insights panel

### Phase 10: UI - New Pages
- [ ] Create `/stats/flow` for full CFD view
- [ ] Create `/stats/velocity` for distribution analysis
- [ ] Create `/stats/compare` for period comparison
- [ ] Update navigation/sidebar with new routes

## Test Criteria

- [ ] Cumulative flow chart renders correctly (0 specs, 1000+ specs)
- [ ] Histogram buckets calculate correctly for various time ranges
- [ ] Sparklines render in all summary cards
- [ ] Insights panel shows/hides correctly based on data
- [ ] Period selector updates all charts correctly
- [ ] Dark/light theme works for all new charts
- [ ] Mobile responsiveness for dashboard
- [ ] Chart animations are smooth (< 60ms frame time)
- [ ] Tooltip positioning works on chart edges

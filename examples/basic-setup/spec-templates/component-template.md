# [Component Name]

> **Type**: [React Component | Service | Utility | etc.]  
> **Location**: `src/components/[path]`

## Goal (Why)

[Why does this component exist? What problem does it solve in the application architecture?]

---

## Component API

### Props / Parameters

```typescript
interface ComponentProps {
  // Required props
  prop1: string;           // [Description]
  prop2: number;           // [Description]
  
  // Optional props
  prop3?: boolean;         // [Description, default: false]
  onEvent?: () => void;    // [Description of callback]
}
```

### Return / Output

[What does this component render or return?]

---

## Key Scenarios

### Scenario 1: [Default Usage]
```jsx
<Component 
  prop1="value"
  prop2={42}
/>
```
**Expected**: [What should happen]

### Scenario 2: [With Optional Props]
```jsx
<Component 
  prop1="value"
  prop2={42}
  prop3={true}
  onEvent={() => console.log('event')}
/>
```
**Expected**: [What should happen]

### Scenario 3: [Edge Case]
[Describe edge case and expected behavior]

---

## Acceptance Criteria

### Functionality
- [ ] Renders correctly with required props
- [ ] Handles optional props appropriately
- [ ] Calls callbacks at the right time
- [ ] Updates correctly when props change

### User Experience
- [ ] Accessible (ARIA labels, keyboard navigation)
- [ ] Responsive on mobile and desktop
- [ ] Provides loading states when needed
- [ ] Shows appropriate error states

### Code Quality
- [ ] Properly typed (TypeScript)
- [ ] Unit tests for core logic
- [ ] Integration tests for user interactions
- [ ] Documented with JSDoc/comments

### Performance
- [ ] Doesn't cause unnecessary re-renders
- [ ] Memoizes expensive computations
- [ ] Lazy loads if appropriate

---

## Technical Contracts

### Dependencies
- [List key dependencies]
- [State management libraries]
- [Styling approach]

### State Management
[How does this component manage state? Local state, context, redux, etc.]

### Side Effects
[What side effects does this component have? API calls, localStorage, etc.]

### Events / Callbacks
| Event | When | Payload |
|-------|------|---------|
| `onEvent` | [When triggered] | [What data is passed] |

---

## Usage Examples

### Example 1: Basic Usage
```jsx
import { Component } from './Component';

function ParentComponent() {
  return (
    <Component 
      prop1="hello"
      prop2={100}
    />
  );
}
```

### Example 2: With State Management
```jsx
import { Component } from './Component';
import { useState } from 'react';

function ParentComponent() {
  const [value, setValue] = useState(0);
  
  return (
    <Component 
      prop1="counter"
      prop2={value}
      onEvent={() => setValue(v => v + 1)}
    />
  );
}
```

---

## Styling

**Approach**: [CSS Modules | Styled Components | Tailwind | etc.]

**Customization**: [How can consumers customize the appearance?]

---

## Accessibility

- [ ] Keyboard navigable
- [ ] Screen reader friendly
- [ ] ARIA labels present
- [ ] Focus management handled
- [ ] Color contrast meets WCAG standards

---

## Testing Strategy

### Unit Tests
```javascript
describe('Component', () => {
  it('renders with required props', () => {
    // test
  });
  
  it('calls onEvent when [action]', () => {
    // test
  });
});
```

### Integration Tests
[Describe key integration test scenarios]

---

## Non-Goals

- Not handling [specific use case]
- Not supporting [browser/feature]
- Not optimizing for [scenario]

---

## Related Components

- [Link to related components]
- [Link to parent/child components]

---

**Created**: [Date]  
**Last Updated**: [Date]  
**Status**: [Draft | Active | Deprecated]

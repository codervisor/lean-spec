# 42. Implement Event Sourcing for Audit Trail

Date: 2024-06-20

## Status

Accepted

## Context

We need a robust audit trail for compliance and debugging:

- **Compliance**: Financial regulations require complete transaction history
- **Debugging**: Need to reconstruct past system state for bug investigation
- **Analytics**: Business wants to analyze user behavior over time
- **Undo/Replay**: Support for temporal queries and state reconstruction

Current CRUD approach has limitations:
- Updates overwrite previous state (no history)
- Audit tables become complex and error-prone
- Hard to reconstruct why changes were made
- No way to replay events for testing

## Decision

Implement **Event Sourcing** for critical business entities:

### Scope
- Apply to: Orders, Payments, Inventory, User Actions
- Not for: Read-heavy data (product catalog, user profiles)

### Architecture

```
Command → Aggregate → Event → Event Store
                                    ↓
                            Event Handler → Read Model
```

1. **Event Store**: Append-only log of all domain events
2. **Aggregates**: Reconstruct current state by replaying events
3. **Projections**: Build read models from event stream
4. **Snapshots**: Cache aggregate state for performance

### Technology Stack
- **Event Store**: PostgreSQL with JSONB (or EventStoreDB for scale)
- **Message Bus**: RabbitMQ for event distribution
- **Read Models**: PostgreSQL for queries, Redis for caching

### Event Example

```json
{
  "eventId": "evt_123",
  "eventType": "OrderPlaced",
  "aggregateId": "order_456",
  "aggregateType": "Order",
  "timestamp": "2024-06-20T10:30:00Z",
  "userId": "user_789",
  "data": {
    "orderId": "order_456",
    "items": [...],
    "total": 99.99
  },
  "version": 1
}
```

## Consequences

### Positive

- **Complete Audit Trail**: Every change captured as immutable event
- **Temporal Queries**: Query state at any point in time
- **Debugging**: Replay events to reproduce bugs
- **Analytics**: Rich event stream for business intelligence
- **Scalability**: Separate read/write models, optimize independently
- **Flexibility**: Easy to add new projections without migrating data

### Negative

- **Complexity**: Steep learning curve for developers
- **Eventual Consistency**: Read models lag behind writes
- **Storage**: Events accumulate over time (need archival strategy)
- **Schema Evolution**: Changing event structure requires versioning
- **Tooling**: Need custom tooling for event replay and debugging

### Mitigation

- Start with one bounded context (Orders) as proof of concept
- Use snapshots to limit event replay overhead (snapshot every 100 events)
- Implement event versioning and upcasting from day one
- Create developer tools for event visualization and debugging
- Set up automated archival (move events >1 year to cold storage)

## Implementation Plan

1. **Phase 1** (2 weeks): Event store infrastructure, basic Orders aggregate
2. **Phase 2** (2 weeks): Event handlers, read model projections
3. **Phase 3** (1 week): Snapshots, performance optimization
4. **Phase 4** (1 week): Developer tooling, documentation

## References

- [Event Sourcing by Martin Fowler](https://martinfowler.com/eaaDev/EventSourcing.html)
- [CQRS Journey by Microsoft](https://docs.microsoft.com/en-us/previous-versions/msp-n-p/jj554200(v=pandp.10))
- [Event Sourcing Patterns](https://serverlessland.com/event-driven-architecture/visuals/event-sourcing-pattern)

# 105. Adopt GraphQL for API Layer

Date: 2024-08-10

## Status

Accepted

Supersedes: ADR-0018 (REST API Standards)

## Context

Our REST API has evolved to have several pain points:

- **Over-fetching**: Mobile clients download unnecessary data (bandwidth waste)
- **Under-fetching**: Multiple requests needed to render single view (N+1 queries)
- **API Versioning**: Breaking changes require new API versions
- **Documentation**: OpenAPI specs become stale
- **Mobile Performance**: Slow on 3G networks due to multiple round-trips

Frontend team feedback:
- "We need 5 REST calls just to render the dashboard"
- "Mobile app is slow because of chattiness"
- "We only use 20% of the data from /users endpoint"

## Decision

Migrate to **GraphQL** for client-facing API while keeping REST for service-to-service communication.

### Architecture

```
Mobile/Web → GraphQL Gateway → [Microservices (REST)]
```

- **GraphQL Gateway**: Apollo Server as BFF (Backend for Frontend)
- **Schema-First**: Define GraphQL schema, generate TypeScript types
- **DataLoader**: Batch and cache backend requests to prevent N+1
- **Federation**: Each service contributes schema fragments (Apollo Federation)

### Query Example

```graphql
query Dashboard {
  me {
    id
    name
    avatar
    projects(limit: 5) {
      id
      name
      taskCount
      recentTasks(limit: 3) {
        id
        title
        status
      }
    }
  }
}
```

One request replaces 5+ REST calls!

### Technology Choices

- **Server**: Apollo Server (Node.js)
- **Schema Management**: Apollo Studio for schema registry
- **Caching**: Redis + Apollo Cache Control headers
- **Authorization**: Field-level with custom directives (`@auth`)
- **Subscriptions**: WebSocket for real-time updates

## Consequences

### Positive

- **Efficient Queries**: Clients request exactly what they need
- **Single Round-Trip**: One request for complex views
- **Strong Typing**: GraphQL schema as contract (auto-generated TS types)
- **Self-Documenting**: Schema serves as documentation
- **Real-time**: Built-in subscriptions for live data
- **Incremental Adoption**: REST endpoints remain, migrate gradually

### Negative

- **Complexity**: New paradigm for backend team to learn
- **Caching**: HTTP caching less effective (mostly POST requests)
- **Query Cost**: Expensive queries can DoS the server
- **File Uploads**: Less elegant than REST multipart
- **Monitoring**: Need GraphQL-specific observability tools

### Mitigation

- Implement query complexity analysis (max depth: 5, max complexity: 1000)
- Use persisted queries for production (whitelist known queries)
- Set up DataLoader to prevent N+1 queries to backend services
- Add Apollo Studio monitoring for query performance
- Keep REST for heavy operations (file uploads, webhooks)
- Provide team training on GraphQL best practices

## Implementation Plan

### Phase 1: Foundation (2 weeks)
- Set up Apollo Server with schema-first approach
- Migrate 3 core endpoints (users, projects, tasks)
- Implement authentication and authorization directives

### Phase 2: Mobile Migration (3 weeks)
- Update mobile app to use GraphQL
- Implement DataLoader for all resolvers
- Set up query complexity limits

### Phase 3: Advanced Features (2 weeks)
- Add subscriptions for real-time updates
- Implement persisted queries
- Set up Apollo Studio monitoring

### Phase 4: Gradual Migration (ongoing)
- Migrate remaining REST endpoints to GraphQL
- Deprecate old REST endpoints with 6-month sunset window

## Alternatives Considered

### REST with Custom Views
- **Pro**: Simpler, no new tech
- **Con**: Still requires multiple endpoints, versioning issues

### gRPC
- **Pro**: Better performance than GraphQL
- **Con**: Not suitable for web browsers, requires code generation

### Keep Current REST
- **Pro**: No migration cost
- **Con**: Problems continue to worsen as app grows

## References

- [GraphQL Official Documentation](https://graphql.org/)
- [Apollo Federation Guide](https://www.apollographql.com/docs/federation/)
- [Production Ready GraphQL](https://book.productionreadygraphql.com/)

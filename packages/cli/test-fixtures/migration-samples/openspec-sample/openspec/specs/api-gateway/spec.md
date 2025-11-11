# API Gateway Service

## Overview

Design and implement a centralized API gateway to handle routing, rate limiting, and authentication for all microservices.

## Problem

Current architecture has clients calling microservices directly, leading to:
- Duplicate authentication logic across services
- No centralized rate limiting
- Complex client-side routing
- Inconsistent error handling
- CORS configuration scattered everywhere

## Solution

Implement a unified API gateway using Kong/Express that:
- Routes requests to appropriate microservices
- Handles authentication/authorization centrally
- Applies rate limiting per client
- Transforms requests/responses as needed
- Provides observability and logging

## Architecture

```
Client → API Gateway → [Auth Service, User Service, Order Service, ...]
```

### Gateway Responsibilities

1. **Request Routing**: Map `/api/users/*` → User Service
2. **Authentication**: Validate JWT tokens before forwarding
3. **Rate Limiting**: 100 req/min per API key
4. **Request/Response Transformation**: Add correlation IDs, sanitize errors
5. **Load Balancing**: Distribute load across service instances
6. **Circuit Breaking**: Fail fast when services are down

## Implementation Plan

### Phase 1: Core Gateway (Week 1-2)
- Set up Kong/Express gateway
- Configure basic routing rules
- Implement health checks

### Phase 2: Authentication (Week 3)
- Integrate with auth service
- JWT validation middleware
- API key management

### Phase 3: Resilience (Week 4)
- Rate limiting per client
- Circuit breakers
- Retry logic with exponential backoff

### Phase 4: Observability (Week 5)
- Request tracing with OpenTelemetry
- Metrics collection (Prometheus)
- Centralized logging (ELK stack)

## Configuration Example

```yaml
routes:
  - path: /api/users/*
    service: user-service
    upstream: http://user-service:3000
    auth: required
    rate_limit: 100/min
    
  - path: /api/orders/*
    service: order-service
    upstream: http://order-service:3001
    auth: required
    rate_limit: 50/min
    
  - path: /api/public/*
    service: content-service
    upstream: http://content-service:3002
    auth: none
    rate_limit: 1000/min
```

## Testing Strategy

- Load testing with k6 (10k concurrent users)
- Chaos engineering (kill random services)
- Security testing (invalid tokens, injection)
- Performance benchmarking (< 10ms latency overhead)

## Rollout

- Deploy to staging first
- Gradual rollout: 10% → 50% → 100% of traffic
- Monitor error rates and latency
- Rollback plan: DNS switch back to direct service calls

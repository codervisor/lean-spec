# API: [API Name]

> **Endpoint**: `[METHOD] /api/path/to/resource`

## Goal (Why)

[Why does this API exist? What client needs does it serve?]

---

## Authentication & Authorization

**Auth Type**: [Bearer Token | API Key | OAuth | etc.]  
**Required Permissions**: [List specific permissions needed]

---

## Request

### Endpoint
```
[METHOD] /api/v1/resource/{id}
```

### Headers
```
Content-Type: application/json
Authorization: Bearer {token}
[Other required headers]
```

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `id` | string | Yes | [Description] |

### Query Parameters
| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `filter` | string | No | null | [Description] |
| `limit` | integer | No | 20 | [Description] |

### Request Body
```json
{
  "field1": "string",
  "field2": 123,
  "nested": {
    "subfield": true
  }
}
```

**Schema Validation**:
- `field1`: Required, max 255 characters
- `field2`: Required, integer between 1-1000
- `nested.subfield`: Optional, boolean

---

## Response

### Success Response (200 OK)
```json
{
  "id": "string",
  "field1": "string",
  "field2": 123,
  "created_at": "2024-01-01T00:00:00Z"
}
```

### Created Response (201 Created)
```json
{
  "id": "newly-created-id",
  "message": "Resource created successfully"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "validation_error",
  "message": "field1 is required",
  "details": {
    "field": "field1",
    "reason": "missing_required_field"
  }
}
```

#### 401 Unauthorized
```json
{
  "error": "unauthorized",
  "message": "Invalid or expired token"
}
```

#### 403 Forbidden
```json
{
  "error": "forbidden",
  "message": "Insufficient permissions"
}
```

#### 404 Not Found
```json
{
  "error": "not_found",
  "message": "Resource not found"
}
```

#### 429 Too Many Requests
```json
{
  "error": "rate_limit_exceeded",
  "message": "Too many requests",
  "retry_after": 60
}
```

#### 500 Internal Server Error
```json
{
  "error": "internal_error",
  "message": "An unexpected error occurred",
  "request_id": "req_123"
}
```

---

## Key Scenarios

### Scenario 1: [Typical Usage]
1. Client sends request with valid parameters
2. API processes request successfully
3. Returns 200 with expected data

### Scenario 2: [Error Case]
1. Client sends request with invalid data
2. API validates and rejects request
3. Returns 400 with clear error message

---

## Acceptance Criteria

### Functional
- [ ] Accepts valid requests and returns correct data
- [ ] Validates all input parameters
- [ ] Returns appropriate error codes for different failure modes
- [ ] Handles authentication and authorization correctly

### Performance
- [ ] Responds within [X]ms for 95th percentile
- [ ] Handles [X] requests per second

### Security
- [ ] Validates and sanitizes all inputs
- [ ] Enforces rate limiting
- [ ] Logs security-relevant events

### Documentation
- [ ] OpenAPI/Swagger spec is generated and accurate
- [ ] Example requests and responses are provided

---

## Rate Limits

- **Rate**: [X] requests per [time period] per [user/IP/API key]
- **Burst**: [Y] requests allowed in short burst
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## Technical Contracts

### Dependencies
- [Database/Service it depends on]
- [External APIs it calls]

### Side Effects
- [What changes in the system when this API is called]

### Idempotency
- [Is this API idempotent? How?]

### Caching
- [Cache headers, strategies]

---

## Non-Goals

- Not supporting [specific format/feature]
- Not implementing [future enhancement]

---

## Examples

### Example 1: [Common Use Case]

**Request**:
```bash
curl -X POST https://api.example.com/v1/resource \
  -H "Authorization: Bearer token123" \
  -H "Content-Type: application/json" \
  -d '{
    "field1": "value1",
    "field2": 42
  }'
```

**Response**:
```json
{
  "id": "res_abc123",
  "field1": "value1",
  "field2": 42,
  "created_at": "2024-01-01T12:00:00Z"
}
```

### Example 2: [Error Case]

**Request**:
```bash
curl -X POST https://api.example.com/v1/resource \
  -H "Authorization: Bearer token123" \
  -H "Content-Type: application/json" \
  -d '{
    "field2": 42
  }'
```

**Response** (400):
```json
{
  "error": "validation_error",
  "message": "field1 is required"
}
```

---

**API Version**: v1  
**Created**: [Date]  
**Last Updated**: [Date]  
**Status**: [Draft | Active | Deprecated]

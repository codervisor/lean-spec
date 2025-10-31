# example-api-endpoint

**Status**: 📅 Planned  
**Created**: 2025-10-31  
**API Version**: v1

## Overview

Example API spec. Shows endpoint design, auth, errors.

## Endpoints

### `GET /api/v1/users/{id}`

**Description**: Get user by ID

**Auth**: Bearer token required

**Response** (200):
```json
{
  "id": "abc123",
  "name": "John Doe",
  "email": "john@example.com"
}
```

**Errors**:
- `401 Unauthorized`: Invalid/missing token
- `404 Not Found`: User doesn't exist

### `POST /api/v1/users`

**Description**: Create new user

**Request**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response** (201):
```json
{
  "id": "def456",
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

## Authentication

Bearer token in Authorization header:
```
Authorization: Bearer <token>
```

## Rate Limiting

1000 requests/hour per token

## Notes

Keep API specs focused on the contract. Implementation details go in code comments.

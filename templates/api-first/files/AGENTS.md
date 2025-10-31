# AI Agent Instructions - API Development

## API Standards

- RESTful conventions (or GraphQL/gRPC if applicable)
- OpenAPI/Swagger documentation required
- All endpoints require authentication
- Consistent error responses

## Design First

1. Spec the API contract before implementation
2. Get feedback on endpoint design
3. Implement after contract is approved
4. Keep spec in sync with implementation

## Common Patterns

### Error Response
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable"
  }
}
```

### Status Codes
- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized
- 404: Not found
- 500: Server error

## Before Submitting

- [ ] OpenAPI spec updated
- [ ] Authentication working
- [ ] Error handling consistent
- [ ] API tests passing

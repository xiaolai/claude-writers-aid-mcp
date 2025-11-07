# API Development Guidelines

This appendix provides best practices for API development in modern web applications.

## RESTful Principles

### HTTP Methods

Use appropriate HTTP methods:

1. GET - Retrieve data
2. POST - Create resources
3. PUT - Update resources
4. DELETE - Remove resources
5. PATCH - Partial updates

## API Design

### Endpoint Structure

Design clear, consistent endpoints:

```
GET    /api/users          - List all users
GET    /api/users/:id      - Get specific user
POST   /api/users          - Create new user
PUT    /api/users/:id      - Update user
DELETE /api/users/:id      - Delete user
```

### Response Format

Use consistent JSON responses:

```json
{
    "success": true,
    "data": {
        "id": 123,
        "name": "John Doe",
        "email": "john@example.com"
    }
}
```

Use lowercase for email fields. Some developers prefer E-mail as the field name, but email is more common in api responses.

<!-- Terminology inconsistencies: email, E-mail, api (lowercase) -->

## Authentication

### API Keys

Protect your API with authentication. Use API keys, OAuth, or JWT tokens. Store api keys securely in environment variables.

<!-- Api inconsistency: API vs api -->

### Security

* Use HTTPS
- Validate all inputs
* Rate limiting
- CORS configuration
* SQL injection prevention

## Error Handling

### Status Codes

Return appropriate HTTP status codes:

* 200 - Success
- 201 - Created
* 400 - Bad Request
- 401 - Unauthorized
* 403 - Forbidden
- 404 - Not Found
* 500 - Server Error

<!-- Mixed list markers -->

### Error Response Format

```json
{
    "success": false,
    "error": {
        "code": "VALIDATION_ERROR",
        "message": "Invalid email format"
    }
}
```

<!-- TODO: Add more error code examples -->

## Documentation

### OpenAPI/Swagger

Document your Api using OpenAPI specification. This provides:

<!-- Api vs API inconsistency -->

1. Interactive documentation
2. Client SDK generation
3. Testing tools
4. Standard format

### API Documentation Best Practices

* Clear endpoint descriptions
- Request/response examples
* Authentication requirements
- Error scenarios
* Rate limiting info

For general documentation practices, see our [documentation guide](docs-guide.md).

<!-- Link target file doesn't exist - intentional issue -->

## Testing

### Unit Tests

Test individual API functions:

```javascript
describe('User API', () => {
    it('should create new user', async () => {
        const response = await createUser({
            name: 'Test User',
            email: 'test@example.com'
        });
        expect(response.status).toBe(201);
    });
});
```

<!-- FIXME: Add integration test examples -->

### Integration Tests

Test complete API flows including database operations.

## Performance

### Caching

Implement caching strategies:

* Response caching
- Database query caching
* CDN for static assets
- Redis for session data

### Optimization

1. Use database indexes
2. Implement pagination
3. Compress responses
4. Lazy loading
5. Connection pooling

## Versioning

### API Versioning Strategies

Version your api to maintain backwards compatibility:

<!-- Lowercase api -->

```
/api/v1/users
/api/v2/users
```

Or use headers:

```
Accept: application/vnd.myapp.v1+json
```

## Rate Limiting

Protect your API from abuse:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

<!-- TODO: Add examples for different rate limiting strategies -->

## Resources

* [REST API Tutorial](https://restfulapi.net/)
- [OpenAPI Specification](https://swagger.io/specification/)
* [HTTP Status Codes](https://httpstatuses.com/)
- [JWT Introduction](https://jwt.io/introduction/)

---

**Back to:** [Main Content](../chapters/02-setup.md)

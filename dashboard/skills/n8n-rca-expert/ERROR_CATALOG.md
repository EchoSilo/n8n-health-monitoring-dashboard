# n8n Error Catalog

Complete reference of common n8n errors with patterns and fixes.

---

## Connection Errors

### ECONNREFUSED

**Pattern**: `Error: connect ECONNREFUSED <ip>:<port>`

**Causes**:
- Target service not running
- Wrong port number
- Service crashed

**Fixes**:
1. Verify service is running
2. Check URL and port configuration
3. Restart target service
4. Check Docker container status

**RCA Example**:
```
Symptom: ECONNREFUSED 127.0.0.1:5000
Why? → Flask API not responding on port 5000
Why? → Container stopped
Why? → Out of memory
ROOT CAUSE: Memory limits too restrictive
```

---

### ETIMEDOUT

**Pattern**: `Error: connect ETIMEDOUT` or `timeout of <ms>ms exceeded`

**Causes**:
- Slow API response
- Network latency
- Overloaded server
- Too much data

**Fixes**:
1. Increase timeout setting
2. Add pagination/batching
3. Check API performance
4. Use async patterns

**RCA Example**:
```
Symptom: Request timeout after 30s
Why? → API response took 45s
Why? → Query returned 10,000 records
Why? → No pagination
ROOT CAUSE: Unbounded query without limits
```

---

### ENOTFOUND

**Pattern**: `Error: getaddrinfo ENOTFOUND <hostname>`

**Causes**:
- Invalid hostname
- DNS resolution failure
- Network misconfiguration

**Fixes**:
1. Verify hostname spelling
2. Check DNS settings
3. Use IP address as fallback
4. Check network connectivity

---

### SSL/TLS Errors

**Pattern**: `self signed certificate`, `certificate has expired`

**Causes**:
- Self-signed certificate
- Expired certificate
- Certificate chain incomplete

**Fixes**:
1. Enable "Ignore SSL Issues" option
2. Update/renew certificate
3. Add CA certificate to trust store

---

## Authentication Errors

### 401 Unauthorized

**Pattern**: HTTP 401, `Unauthorized`, `Authentication failed`

**Causes**:
- Invalid credentials
- Expired token
- Wrong API key
- Missing authentication header

**Fixes**:
1. Regenerate/refresh credentials
2. Check credential configuration
3. Verify API key format
4. Re-authenticate OAuth

---

### 403 Forbidden

**Pattern**: HTTP 403, `Access denied`, `Forbidden`

**Causes**:
- Insufficient permissions
- IP not allowed
- Resource locked
- Rate limit (disguised)

**Fixes**:
1. Check permission scopes
2. Verify IP allowlist
3. Request elevated access
4. Check resource ownership

---

### OAuth Token Errors

**Pattern**: `token expired`, `invalid_grant`, `refresh_token revoked`

**Causes**:
- Token expired
- Refresh token revoked
- OAuth app deleted
- Permissions changed

**Fixes**:
1. Re-authenticate OAuth connection
2. Check OAuth app status
3. Request new authorization
4. Verify scopes haven't changed

---

## Data Errors

### Invalid JSON

**Pattern**: `Unexpected token`, `JSON parse error`

**Causes**:
- Malformed JSON response
- Empty response body
- Binary data in text field
- Encoding issues

**Fixes**:
1. Validate response before parsing
2. Add error handling for empty responses
3. Check Content-Type header
4. Use Try/Catch pattern

---

### Type Mismatch

**Pattern**: `Expected <type>, got <type>`, `Cannot convert`

**Causes**:
- String instead of number
- Object instead of array
- Null instead of value
- Date format mismatch

**Fixes**:
1. Add type conversion node
2. Use Default Value nodes
3. Validate input types
4. Transform data before use

---

### Missing Required Field

**Pattern**: `Required field missing`, `property is required`

**Causes**:
- Incomplete input data
- Conditional field not set
- Expression returned undefined
- API schema changed

**Fixes**:
1. Add IF node for validation
2. Set default values
3. Use optional chaining
4. Update for schema changes

---

## Expression Errors

### Property Access Error

**Pattern**: `Cannot read property '<name>' of undefined/null`

**Causes**:
- Parent object undefined
- Missing data in input
- Wrong node reference
- Typo in property name

**Fixes**:
1. Use optional chaining: `$json.data?.items`
2. Add null checks: `$json.data ?? []`
3. Verify node reference exists
4. Check property name spelling

---

### Invalid Expression Syntax

**Pattern**: `Invalid expression`, `Unexpected token in expression`

**Causes**:
- Missing `{{ }}`
- Unclosed brackets
- Invalid JavaScript syntax
- Mixed expression styles

**Fixes**:
1. Ensure expressions start with `={{`
2. Check bracket matching
3. Use n8n expression builder
4. Simplify complex expressions

---

## Rate Limiting

### 429 Too Many Requests

**Pattern**: HTTP 429, `Rate limit exceeded`, `Too many requests`

**Causes**:
- Too many concurrent requests
- Exceeding API quota
- No delays between requests
- Burst traffic

**Fixes**:
1. Add SplitInBatches node
2. Configure Wait node for delays
3. Enable retry with backoff
4. Reduce batch sizes

**Prevention**:
```javascript
// In HTTP Request node settings:
{
  "options": {
    "batching": {
      "batch": {
        "batchSize": 10,
        "batchInterval": 1000  // 1 second delay
      }
    }
  }
}
```

---

## Node-Specific Errors

### Slack

**Common Errors**:
- `channel_not_found` - Invalid channel ID/name
- `not_in_channel` - Bot not added to channel
- `no_permission` - Missing OAuth scopes

**Fixes**:
1. Verify channel ID format
2. Add bot to channel
3. Check OAuth scopes in app settings

---

### Google Sheets

**Common Errors**:
- `PERMISSION_DENIED` - No access to sheet
- `INVALID_ARGUMENT` - Bad column/row reference
- `NOT_FOUND` - Sheet/tab doesn't exist

**Fixes**:
1. Share sheet with service account
2. Verify column/row references
3. Check sheet/tab names

---

### HTTP Request

**Common Errors**:
- SSL certificate issues
- Timeout errors
- 4xx/5xx responses

**Fixes**:
1. Enable "Ignore SSL Issues" if needed
2. Increase timeout value
3. Add proper error handling
4. Check response status codes

---

### Webhook

**Common Errors**:
- `Webhook not found` - Workflow not active
- `Method not allowed` - Wrong HTTP method
- No response - Respond to Webhook missing

**Fixes**:
1. Activate workflow
2. Match HTTP method to request
3. Add "Respond to Webhook" node

---

### Code Node

**Common Errors**:
- Syntax errors
- Undefined variables
- Return format issues

**Fixes**:
1. Return array of objects: `return [{json: {...}}]`
2. Use $input.all() for all items
3. Check JavaScript syntax
4. Log intermediate values

---

## Error Response Patterns

### Standard Error Object

```javascript
{
  "error": true,
  "message": "Error description",
  "errorCode": "ERROR_CODE",
  "node": "Node Name",
  "timestamp": "2024-01-15T10:30:00Z",
  "stack": "Error stack trace..."
}
```

### Using Error Information

```javascript
// In Code node for error handling
try {
  // Your code
} catch (error) {
  return [{
    json: {
      error: true,
      message: error.message,
      node: $node.name,
      input: $input.first().json
    }
  }];
}
```

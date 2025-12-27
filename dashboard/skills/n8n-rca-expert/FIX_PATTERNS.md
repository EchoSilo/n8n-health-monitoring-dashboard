# n8n Fix Patterns and Prevention Strategies

Common fixes organized by error category with prevention measures.

---

## Connection Errors

### ECONNREFUSED

**Quick Fixes**:
1. Verify service URL and port
2. Check if target service is running
3. Test connectivity with HTTP Request node in test mode

**Prevention**:
- Add health check before main request
- Implement circuit breaker pattern with IF node
- Set up monitoring for dependent services

**Workflow Pattern**:
```
[Start] → [Health Check] → [IF: Healthy?]
                               ├─ Yes → [Main Request]
                               └─ No → [Alert + Skip/Retry]
```

### ETIMEDOUT

**Quick Fixes**:
1. Increase timeout in node settings
2. Reduce payload size
3. Add pagination

**Prevention**:
- Set appropriate timeouts (not too short, not infinite)
- Implement request batching
- Add timeout monitoring

**Code Node Pattern**:
```javascript
// Batch processing with timeout awareness
const BATCH_SIZE = 100;
const items = $input.all();
const results = [];

for (let i = 0; i < items.length; i += BATCH_SIZE) {
  const batch = items.slice(i, i + BATCH_SIZE);
  // Process batch
  results.push(...batch);
}

return results;
```

---

## Authentication Errors

### 401 Unauthorized

**Quick Fixes**:
1. Regenerate API key/token
2. Check credential is selected in node
3. Verify API key format matches requirements

**Prevention**:
- Set calendar reminders for key rotation
- Use OAuth with refresh tokens where possible
- Implement credential health checks

### OAuth Token Expiry

**Quick Fixes**:
1. Re-authenticate in credentials
2. Check OAuth app hasn't been revoked
3. Verify scopes haven't changed

**Prevention**:
- Schedule periodic "keep-alive" workflows
- Monitor token expiry dates
- Set up OAuth app monitoring

**Keep-Alive Pattern**:
```
[Schedule: Weekly] → [OAuth API Call] → [IF: Success?]
                                           ├─ Yes → [Log Success]
                                           └─ No → [Alert Admin]
```

---

## Rate Limiting

### 429 Too Many Requests

**Quick Fixes**:
1. Add SplitInBatches node
2. Add Wait node between requests
3. Reduce concurrent executions

**Prevention**:
- Research API limits before building
- Implement exponential backoff
- Use webhook-based updates instead of polling

**Batch + Wait Pattern**:
```
[Get Items] → [SplitInBatches: 10] → [HTTP Request] → [Wait: 1s] → [Loop]
```

**Code Node - Exponential Backoff**:
```javascript
// Retry with exponential backoff
async function fetchWithRetry(url, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await $http.request({ url });
      return response;
    } catch (error) {
      if (error.response?.status === 429 && i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000; // 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

---

## Data Validation

### Missing Required Fields

**Quick Fixes**:
1. Add default values
2. Add IF node to filter incomplete records
3. Use Set node to ensure field exists

**Prevention**:
- Add validation at workflow entry point
- Document expected input schema
- Add data quality monitoring

**Validation Pattern**:
```
[Webhook] → [Code: Validate] → [IF: Valid?]
                                   ├─ Yes → [Process]
                                   └─ No → [Respond: 400 Error]
```

**Validation Code Node**:
```javascript
const item = $input.first().json;
const errors = [];

if (!item.email) errors.push('email is required');
if (!item.name) errors.push('name is required');
if (item.amount && typeof item.amount !== 'number') {
  errors.push('amount must be a number');
}

if (errors.length > 0) {
  return [{
    json: {
      valid: false,
      errors: errors
    }
  }];
}

return [{ json: { valid: true, data: item } }];
```

### Type Mismatches

**Quick Fixes**:
1. Use Set node to convert types
2. Add explicit type conversion in expressions
3. Use Code node for complex transformations

**Prevention**:
- Validate types at entry points
- Use TypeScript-style JSDoc in Code nodes
- Test with edge case data

**Type Conversion Expressions**:
```javascript
// String to number
{{ Number($json.amount) }}

// Number to string
{{ String($json.id) }}

// Parse JSON string
{{ JSON.parse($json.dataString) }}

// Date handling
{{ DateTime.fromISO($json.date).toFormat('yyyy-MM-dd') }}
```

---

## Expression Errors

### Property Access on Undefined

**Quick Fixes**:
1. Use optional chaining: `$json.data?.items`
2. Use nullish coalescing: `$json.value ?? 'default'`
3. Check array length before accessing

**Prevention**:
- Always use optional chaining for nested access
- Add default values for optional fields
- Document expected data shapes

**Safe Access Patterns**:
```javascript
// Safe nested access
{{ $json.response?.data?.users?.[0]?.email ?? 'no-email' }}

// Safe array access
{{ ($json.items || [])[0]?.name ?? 'Unknown' }}

// Safe function call
{{ $json.items?.map?.(i => i.id) ?? [] }}
```

---

## Webhook Errors

### Webhook Not Found (404)

**Quick Fixes**:
1. Activate the workflow
2. Verify webhook path matches
3. Check HTTP method matches

**Prevention**:
- Document webhook URLs in external systems
- Set up uptime monitoring for webhooks
- Use webhook testing tools

### No Response Sent

**Quick Fixes**:
1. Add "Respond to Webhook" node
2. Ensure all branches have response nodes
3. Check for errors before response node

**Prevention**:
- Always add Respond to Webhook as first design step
- Use error workflow to ensure responses on failure
- Set appropriate response timeouts

**Webhook Response Pattern**:
```
[Webhook] → [Try] → [Process] → [Respond: 200]
               └─ [Catch] → [Respond: 500]
```

---

## Error Handling Patterns

### Global Error Workflow

Create a dedicated error handling workflow:

```
[Error Trigger] → [Extract Error Info] → [Log to Database]
                                       → [Send Alert]
                                       → [Create Ticket]
```

### Try-Catch Pattern

```
[Start] → [Execute Workflow: Main] → [IF: Success?]
                                        ├─ Yes → [Continue]
                                        └─ No → [Handle Error]
```

### Circuit Breaker

```javascript
// In Code node - Simple circuit breaker
const FAILURE_THRESHOLD = 5;
const RESET_TIME_MS = 60000;

// Get circuit state from static data
const state = $getWorkflowStaticData('global');
const failures = state.failures || 0;
const lastFailure = state.lastFailure || 0;

// Check if circuit should reset
if (Date.now() - lastFailure > RESET_TIME_MS) {
  state.failures = 0;
}

// Check if circuit is open
if (failures >= FAILURE_THRESHOLD) {
  throw new Error('Circuit breaker is open - too many recent failures');
}

return $input.all();
```

---

## Prevention Checklist

### Before Deployment

- [ ] All API endpoints tested with real data
- [ ] Error handling on all external calls
- [ ] Timeout values configured appropriately
- [ ] Rate limits researched and respected
- [ ] Input validation on entry points
- [ ] Response nodes on all webhook paths
- [ ] Credentials tested and documented
- [ ] Error workflow configured

### Monitoring Setup

- [ ] Execution success/failure alerts
- [ ] Duration anomaly detection
- [ ] Credential expiry warnings
- [ ] Dependent service health checks
- [ ] Data volume monitoring
- [ ] Error rate thresholds

### Documentation

- [ ] Expected input/output formats
- [ ] External dependencies listed
- [ ] Error scenarios documented
- [ ] Recovery procedures defined
- [ ] Escalation contacts identified

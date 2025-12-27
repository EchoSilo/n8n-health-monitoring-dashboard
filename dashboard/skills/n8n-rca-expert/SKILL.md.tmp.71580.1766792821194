---
name: n8n-rca-expert
description: Root cause analysis expert for n8n workflow errors. Applies 5 Whys methodology, identifies error patterns, provides actionable fixes, and prevents recurrence. Use when analyzing workflow failures, investigating error chains, or providing actionable fixes for n8n automation errors.
---

# n8n Root Cause Analysis Expert

Expert guide for diagnosing and fixing n8n workflow errors with structured root cause analysis.

---

## 5 Whys Methodology

Start with the symptom and ask "why" until you reach a systemic cause.

### Example RCA Chain

```
Why did the HTTP request fail? → Connection timeout after 30s
Why did it timeout? → The external API response was slow
Why was the API slow? → The request payload was too large
Why was the payload large? → All records being sent instead of batch
Why all records? → Missing pagination in the Code node
ROOT CAUSE: Missing pagination implementation
```

### RCA Output Structure

When analyzing errors, produce this structured output:

```json
{
  "fiveWhys": {
    "symptom": "HTTP request failed with timeout",
    "whys": [
      {
        "question": "Why did the HTTP request fail?",
        "answer": "Connection timeout after 30 seconds",
        "evidence": "Error message shows ETIMEDOUT"
      },
      {
        "question": "Why did it timeout?",
        "answer": "External API response was slow",
        "evidence": "API logs show 45s response time"
      }
    ],
    "rootCause": "Missing pagination causing oversized payloads"
  },
  "gapAnalysis": {
    "safetyNets": [
      {
        "name": "Request timeout configuration",
        "existed": false,
        "whyMissed": "Default timeout of 30s was used"
      },
      {
        "name": "Payload size validation",
        "existed": false,
        "whyMissed": "No validation before sending"
      }
    ]
  },
  "recommendations": {
    "quickWins": [
      {
        "action": "Increase timeout to 60s",
        "effort": "5 minutes",
        "impact": "Prevents immediate failures"
      }
    ],
    "mediumTerm": [
      {
        "action": "Implement pagination in Code node",
        "effort": "1-2 hours",
        "impact": "Fixes root cause"
      }
    ],
    "longTerm": [
      {
        "action": "Add payload size monitoring",
        "effort": "1 day",
        "impact": "Prevents future similar issues"
      }
    ]
  }
}
```

---

## Error Categories

### 1. Connection Errors (35% of errors)

**Patterns**: ECONNREFUSED, ETIMEDOUT, ENOTFOUND, ECONNRESET

**Common Causes**:
- Target service not running or unreachable
- Incorrect URL or hostname
- Firewall blocking connection
- SSL/TLS certificate issues

**Quick Fixes**:
- Check service status
- Verify URL is correct
- Increase timeout settings
- Check network connectivity

**Example**:
```
Error: connect ECONNREFUSED 127.0.0.1:3000
Why? → Service on port 3000 not running
Why? → Docker container crashed
Why? → Container ran out of memory
ROOT CAUSE: Memory limits too low for container
```

### 2. Authentication Errors (25% of errors)

**Patterns**: 401 Unauthorized, 403 Forbidden, Token expired

**Common Causes**:
- Invalid or expired credentials
- Wrong API key format
- Missing required scopes/permissions
- OAuth token refresh failed

**Quick Fixes**:
- Refresh/regenerate credentials
- Verify credential configuration in n8n
- Check API key permissions
- Re-authenticate OAuth connection

**Example**:
```
Error: 401 Unauthorized
Why? → API key rejected
Why? → Key was regenerated in provider
Why? → Admin rotated keys for security
ROOT CAUSE: Credential update not synced to n8n
```

### 3. Rate Limiting (15% of errors)

**Patterns**: 429 Too Many Requests, Rate limit exceeded

**Common Causes**:
- Too many concurrent requests
- Hitting API rate limits
- Batch operations too large
- Missing delays between requests

**Quick Fixes**:
- Add SplitInBatches node with delays
- Configure retry with exponential backoff
- Reduce concurrency in HTTP node
- Cache frequently accessed data

**Example**:
```
Error: 429 Too Many Requests
Why? → 100 requests sent simultaneously
Why? → SplitInBatches not used
Why? → Developer unaware of API limits
ROOT CAUSE: Missing rate limiting configuration
```

### 4. Data Validation Errors (15% of errors)

**Patterns**: Invalid JSON, Type mismatch, Required field missing

**Common Causes**:
- Input data malformed
- Missing required fields
- Type mismatches (string vs number)
- Expression syntax errors

**Quick Fixes**:
- Add IF node for data validation
- Use Default Value nodes
- Add error handling with try/catch
- Validate expressions syntax

**Example**:
```
Error: Cannot read property 'email' of undefined
Why? → Input item missing email field
Why? → Upstream API returned incomplete data
Why? → API pagination returned empty last page
ROOT CAUSE: No validation for empty/incomplete responses
```

### 5. Expression Errors (10% of errors)

**Patterns**: Cannot read property, undefined is not an object

**Common Causes**:
- Accessing non-existent properties
- Missing null checks
- Incorrect node references
- Typos in expressions

**Quick Fixes**:
- Add optional chaining: `$json.data?.items`
- Use default values: `$json.data ?? []`
- Verify node names in expressions
- Check expression syntax in n8n

**Example**:
```
Error: Cannot read property 'items' of undefined
Why? → $json.data is undefined
Why? → Previous node returned error response
Why? → API returned 500 error
ROOT CAUSE: Missing error handling for API failures
```

---

## Gap Analysis Framework

For each error, analyze which safety nets failed:

| Safety Net | Common Gaps |
|------------|-------------|
| **Error Handling** | No onError configuration, silent failures |
| **Retry Logic** | Missing retryOnFail, no backoff strategy |
| **Validation** | No input validation, missing IF conditions |
| **Monitoring** | No error notifications, missing logging |
| **Testing** | Untested edge cases, no integration tests |
| **Documentation** | Unclear requirements, missing runbooks |

---

## Prevention Recommendations

### Quick Wins (< 1 hour)

1. **Add error handling to failing node**
   - Set `onError: 'continueRegularOutput'`
   - Add error notification node

2. **Configure retry with backoff**
   - Enable `retryOnFail`
   - Set reasonable max retries (3-5)

3. **Add input validation**
   - IF node to check required fields
   - Filter out invalid items

### Medium Effort (1 day)

1. **Add monitoring/alerting**
   - Slack/Email on workflow failure
   - Dashboard for error rates

2. **Implement circuit breaker**
   - Stop retrying after X failures
   - Alert on circuit open

3. **Add comprehensive logging**
   - Log inputs/outputs at key nodes
   - Include correlation IDs

### Long-term (1+ week)

1. **Refactor workflow architecture**
   - Split into smaller workflows
   - Add proper error boundaries

2. **Add automated testing**
   - Unit tests for Code nodes
   - Integration tests for workflows

3. **Implement graceful degradation**
   - Fallback for external services
   - Queue for retry later

---

## Confidence Calibration

When analyzing errors, calibrate confidence based on evidence:

| Confidence | When to Use |
|------------|-------------|
| **90-100%** | Clear error message, single root cause, verified in logs |
| **70-89%** | Good evidence, likely cause, some assumptions |
| **50-69%** | Multiple possible causes, limited evidence |
| **< 50%** | Speculative, need more investigation |

---

## Related Documentation

- [ERROR_CATALOG.md](ERROR_CATALOG.md) - Complete error reference
- [FIVE_WHYS.md](FIVE_WHYS.md) - Detailed 5 Whys methodology
- [FIX_PATTERNS.md](FIX_PATTERNS.md) - Common fix patterns

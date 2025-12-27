# 5 Whys Root Cause Analysis Methodology

Structured approach for investigating n8n workflow failures.

---

## The 5 Whys Technique

### Purpose

Find the TRUE root cause, not just the immediate symptom. Most errors have deeper causes that, if left unaddressed, will cause repeated failures.

### Process

```
SYMPTOM → Why? → Why? → Why? → Why? → Why? → ROOT CAUSE
```

Each "Why" digs one layer deeper:
1. **Why 1**: What directly caused the error?
2. **Why 2**: Why did that condition exist?
3. **Why 3**: Why wasn't it prevented?
4. **Why 4**: Why is the system designed this way?
5. **Why 5**: What process/knowledge gap allowed this?

---

## Example Analyses

### Example 1: API Timeout

```
SYMPTOM: HTTP Request node failed with ETIMEDOUT

Why 1? → API response took 45 seconds, timeout was 30 seconds
Why 2? → API returned 10,000 records in single response
Why 3? → No pagination implemented in the request
Why 4? → Original dataset was small, pagination wasn't needed
Why 5? → No monitoring for dataset growth

ROOT CAUSE: Missing pagination + no data volume monitoring
```

### Example 2: Authentication Failure

```
SYMPTOM: OAuth token refresh failed at 3 AM

Why 1? → Refresh token was expired
Why 2? → Token hadn't been used in 90 days
Why 3? → Workflow was manually triggered, not scheduled
Why 4? → No keep-alive mechanism for OAuth tokens
Why 5? → Token lifecycle not considered in design

ROOT CAUSE: No automated token refresh strategy for infrequent workflows
```

### Example 3: Data Processing Error

```
SYMPTOM: Code node crashed with "Cannot read property 'email' of undefined"

Why 1? → Input item was missing the 'email' field
Why 2? → Previous API returned incomplete user record
Why 3? → User account was in "pending" status with no email
Why 4? → No validation for account status before processing
Why 5? → Edge case not discovered during testing

ROOT CAUSE: Missing input validation for edge case user states
```

### Example 4: Webhook Not Triggered

```
SYMPTOM: Workflow never executed when expected

Why 1? → Webhook URL returned 404
Why 2? → Workflow was inactive
Why 3? → Someone deactivated it during maintenance
Why 4? → No notification when critical workflows are deactivated
Why 5? → Workflow criticality not tracked in system

ROOT CAUSE: No workflow criticality classification or deactivation alerts
```

---

## Evidence Collection

For each "Why", gather supporting evidence:

### Execution Data
- Node input/output at failure point
- Previous node outputs (data lineage)
- Timing information (when did delays occur?)

### System State
- Server health at time of failure
- Resource usage (memory, connections)
- Concurrent executions

### External Factors
- API status pages
- Third-party service outages
- Network conditions

### Historical Context
- When did this workflow last succeed?
- What changed between success and failure?
- Similar failures in other workflows?

---

## Common Stopping Points

Stop when you reach one of these categories:

### 1. Design Decision
"The system was designed without considering X"

### 2. Missing Safety Net
"No validation/monitoring/alerting existed for X"

### 3. Knowledge Gap
"The team didn't know about X limitation"

### 4. Process Gap
"No procedure exists for handling X"

### 5. External Dependency
"Third-party service X has undocumented behavior"

---

## Anti-Patterns

### Going Too Shallow

❌ Bad:
```
SYMPTOM: API returned 500 error
Why? → Server had an internal error
ROOT CAUSE: Server error
```

✅ Good:
```
SYMPTOM: API returned 500 error
Why 1? → Server couldn't process our request
Why 2? → Request payload was malformed
Why 3? → Date format was wrong (ISO vs Unix timestamp)
Why 4? → API documentation was ambiguous
Why 5? → No request validation before sending

ROOT CAUSE: Missing request validation + unclear API docs
```

### Blaming People

❌ Bad: "Developer made a mistake"
✅ Good: "No code review process caught the issue"

❌ Bad: "Operator forgot to check"
✅ Good: "No automated pre-flight checks exist"

### Stopping at External Causes

❌ Bad: "Third-party API was down"
✅ Good: "No fallback strategy when third-party API is unavailable"

---

## Integration with n8n Execution Traces

### Using Correlated Executions

When analyzing failures in parent-child workflow chains:

1. **Start at the failing node** - Where did error occur?
2. **Trace upstream** - What data entered this node?
3. **Cross workflow boundaries** - If sub-workflow, check parent's input
4. **Identify transformation points** - Where did data change?
5. **Find the divergence** - When did actual differ from expected?

### Node Trace Analysis

For each node in the execution path:
- **Input**: What data did it receive?
- **Config**: What settings were applied?
- **Output**: What did it produce?
- **Timing**: How long did it take?

### Key Questions

- Which node first encountered unexpected data?
- Did any node silently transform data incorrectly?
- Were there warning signs before the failure?
- What assumptions did the workflow make?

---

## Output Format

Structure your RCA findings as:

```markdown
## Symptom
[Clear description of what failed]

## 5 Whys Analysis

### Why 1
[Answer with evidence]

### Why 2
[Answer with evidence]

### Why 3
[Answer with evidence]

### Why 4
[Answer with evidence]

### Why 5
[Answer with evidence]

## Root Cause
[Definitive statement of the fundamental issue]

## Evidence Summary
- [Key data point 1]
- [Key data point 2]
- [Key data point 3]

## Recommended Fixes
1. [Immediate fix]
2. [Preventive measure]
3. [Systemic improvement]
```

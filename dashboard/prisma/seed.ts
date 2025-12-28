import { PrismaClient, ServerStatus, WorkflowStatus, ErrorSeverity, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const prisma = new PrismaClient();

// Demo account credentials
const DEMO_EMAIL = 'mock@example.com';
const DEMO_PASSWORD = 'DemoPassword#123!';
const DEMO_NAME = 'Demo User';

// Encryption helper for API keys (matches src/lib/encryption.ts)
function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error('ENCRYPTION_KEY environment variable is not set. Run: openssl rand -base64 32');
  }

  const keyBuffer = Buffer.from(key, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error('ENCRYPTION_KEY must be 32 bytes (256 bits) base64 encoded');
  }

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([
    Buffer.from(encrypted, 'base64'),
    authTag,
  ]).toString('base64');

  return {
    encrypted: combined,
    iv: iv.toString('base64'),
  };
}

async function main() {
  console.log('Seeding demo data...');

  // 1. Create or update demo user
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const demoUser = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      name: DEMO_NAME,
      passwordHash,
    },
    create: {
      email: DEMO_EMAIL,
      name: DEMO_NAME,
      passwordHash,
      role: UserRole.MEMBER,
      emailVerified: new Date(),
    },
  });

  console.log(`Demo user created/updated: ${demoUser.email} (ID: ${demoUser.id})`);

  // 2. Create demo servers
  const serverData = [
    {
      name: 'Production-US',
      url: 'https://n8n-prod-us.example.com',
      apiKey: 'demo-api-key-prod-us-12345',
      status: ServerStatus.ONLINE,
      pollingInterval: 30,
    },
    {
      name: 'Production-EU',
      url: 'https://n8n-prod-eu.example.com',
      apiKey: 'demo-api-key-prod-eu-67890',
      status: ServerStatus.ONLINE,
      pollingInterval: 30,
    },
    {
      name: 'Dev-Local',
      url: 'http://localhost:5678',
      apiKey: 'demo-api-key-dev-local',
      status: ServerStatus.DEGRADED,
      pollingInterval: 60,
    },
    {
      name: 'Client-A',
      url: 'https://n8n-client-a.example.com',
      apiKey: 'demo-api-key-client-a',
      status: ServerStatus.ONLINE,
      pollingInterval: 30,
    },
  ];

  // Delete existing demo servers (to ensure clean state)
  await prisma.server.deleteMany({
    where: { createdById: demoUser.id },
  });

  const servers: Array<{ id: string; name: string }> = [];
  for (const data of serverData) {
    const { encrypted, iv } = encrypt(data.apiKey);
    const server = await prisma.server.create({
      data: {
        name: data.name,
        url: data.url,
        apiKey: encrypted,
        apiKeyIv: iv,
        status: data.status,
        pollingInterval: data.pollingInterval,
        lastChecked: new Date(Date.now() - Math.random() * 5 * 60 * 1000), // Random time in last 5 mins
        createdById: demoUser.id,
      },
    });
    servers.push({ id: server.id, name: server.name });
    console.log(`Server created: ${server.name} (ID: ${server.id})`);
  }

  // Helper to get server by name
  const getServerId = (name: string) => servers.find(s => s.name === name)?.id || servers[0].id;

  // 3. Create demo workflows
  const workflowData = [
    {
      n8nId: 'wf-001',
      name: 'Customer Sync',
      serverName: 'Production-US',
      status: WorkflowStatus.ACTIVE,
      active: true,
      lastExecution: new Date(Date.now() - 5 * 60 * 1000),
      executionCount: 1523,
      avgExecTime: 234,
    },
    {
      n8nId: 'wf-002',
      name: 'Order Processing',
      serverName: 'Production-US',
      status: WorkflowStatus.RUNNING,
      active: true,
      lastExecution: new Date(),
      executionCount: 892,
      avgExecTime: 1250,
    },
    {
      n8nId: 'wf-003',
      name: 'Email Notifications',
      serverName: 'Production-EU',
      status: WorkflowStatus.ACTIVE,
      active: true,
      lastExecution: new Date(Date.now() - 15 * 60 * 1000),
      executionCount: 4521,
      avgExecTime: 156,
    },
    {
      n8nId: 'wf-004',
      name: 'Data Backup',
      serverName: 'Production-EU',
      status: WorkflowStatus.FAILED,
      active: true,
      lastExecution: new Date(Date.now() - 30 * 60 * 1000),
      executionCount: 756,
      avgExecTime: 0,
    },
    {
      n8nId: 'wf-005',
      name: 'API Integration',
      serverName: 'Client-A',
      status: WorkflowStatus.INACTIVE,
      active: false,
      lastExecution: new Date(Date.now() - 2 * 60 * 60 * 1000),
      executionCount: 234,
      avgExecTime: 890,
    },
    {
      n8nId: 'wf-006',
      name: 'Report Generation',
      serverName: 'Production-US',
      status: WorkflowStatus.ACTIVE,
      active: true,
      lastExecution: new Date(Date.now() - 60 * 60 * 1000),
      executionCount: 125,
      avgExecTime: 3450,
    },
    {
      n8nId: 'wf-007',
      name: 'Slack Alerts',
      serverName: 'Production-EU',
      status: WorkflowStatus.ACTIVE,
      active: true,
      lastExecution: new Date(Date.now() - 2 * 60 * 1000),
      executionCount: 8901,
      avgExecTime: 89,
    },
  ];

  const workflows: Array<{ id: string; name: string; n8nId: string; serverId: string }> = [];
  for (const data of workflowData) {
    const serverId = getServerId(data.serverName);
    const workflow = await prisma.workflow.create({
      data: {
        n8nId: data.n8nId,
        name: data.name,
        serverId,
        active: data.active,
        status: data.status,
        lastExecution: data.lastExecution,
        executionCount: data.executionCount,
        avgExecTime: data.avgExecTime,
      },
    });
    workflows.push({ id: workflow.id, name: workflow.name, n8nId: data.n8nId, serverId });
    console.log(`Workflow created: ${workflow.name} (ID: ${workflow.id})`);
  }

  // Helper to get workflow by n8nId
  const getWorkflow = (n8nId: string) => workflows.find(w => w.n8nId === n8nId);

  // 4. Create demo error logs
  const errorData = [
    {
      workflowN8nId: 'wf-004',
      message: 'HTTP Request Timeout: Connection to api.example.com timed out after 30000ms',
      severity: ErrorSeverity.CRITICAL,
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      stackTrace: `ETIMEDOUT: Connection timed out after 30000ms
    at ClientRequest.<anonymous> (/app/node_modules/n8n-core/dist/NodeExecuteFunctions.js:892:24)
    at Object.onceWrapper (events.js:420:28)
    at ClientRequest.emit (events.js:314:20)
    at TLSSocket.socketErrorListener (_http_client.js:427:9)
    at TLSSocket.emit (events.js:314:20)
    at emitErrorNT (internal/streams/destroy.js:92:8)`,
      nodeType: 'n8n-nodes-base.httpRequest',
      nodeName: 'HTTP Request',
      hasAIAnalysis: true,
      hasRCA: true,
    },
    {
      workflowN8nId: 'wf-002',
      message: 'Database connection lost: ECONNRESET',
      severity: ErrorSeverity.CRITICAL,
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      stackTrace: `Error: ECONNRESET
    at TLSWrap.onStreamRead (internal/stream_base_commons.js:209:20)`,
      nodeType: 'n8n-nodes-base.postgres',
      nodeName: 'Postgres',
      hasAIAnalysis: true,
      hasRCA: false,
    },
    {
      workflowN8nId: 'wf-006',
      message: 'Rate limit exceeded for Slack API',
      severity: ErrorSeverity.WARNING,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      stackTrace: `SlackAPIError: ratelimited
    at Object.platformErrorFromResult (/app/node_modules/@slack/web-api/dist/errors.js:62:12)`,
      nodeType: 'n8n-nodes-base.slack',
      nodeName: 'Slack',
      hasAIAnalysis: false,
      hasRCA: false,
    },
    {
      workflowN8nId: 'wf-001',
      message: 'Invalid JSON response from external API',
      severity: ErrorSeverity.WARNING,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      stackTrace: null,
      nodeType: 'n8n-nodes-base.httpRequest',
      nodeName: 'HTTP Request',
      hasAIAnalysis: true,
      hasRCA: false,
    },
    {
      workflowN8nId: 'wf-005',
      message: 'Authentication token expired',
      severity: ErrorSeverity.INFO,
      timestamp: new Date(Date.now() - 12 * 60 * 60 * 1000),
      stackTrace: null,
      nodeType: 'n8n-nodes-base.httpRequest',
      nodeName: 'HTTP Request Auth',
      hasAIAnalysis: false,
      hasRCA: false,
    },
  ];

  const errors: Array<{ id: string; workflowN8nId: string; hasAIAnalysis: boolean; hasRCA: boolean }> = [];
  for (const data of errorData) {
    const workflow = getWorkflow(data.workflowN8nId);
    if (!workflow) continue;

    const error = await prisma.errorLog.create({
      data: {
        workflowId: workflow.id,
        serverId: workflow.serverId,
        message: data.message,
        severity: data.severity,
        timestamp: data.timestamp,
        stackTrace: data.stackTrace,
        nodeType: data.nodeType,
        nodeName: data.nodeName,
        resolved: false,
      },
    });
    errors.push({
      id: error.id,
      workflowN8nId: data.workflowN8nId,
      hasAIAnalysis: data.hasAIAnalysis,
      hasRCA: data.hasRCA,
    });
    console.log(`Error created: ${data.message.substring(0, 40)}... (ID: ${error.id})`);
  }

  // 5. Create AI Analysis for first error (HTTP Timeout)
  const firstError = errors.find(e => e.workflowN8nId === 'wf-004' && e.hasAIAnalysis);
  if (firstError) {
    await prisma.aIAnalysis.create({
      data: {
        errorId: firstError.id,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        confidence: 94,
        rootCause: 'The external API at api.example.com is experiencing high latency or is temporarily unavailable.',
        suggestedFix: [
          'Check api.example.com status page for any ongoing incidents',
          'Increase the HTTP request timeout from 30s to 60s in the workflow settings',
          'Add retry logic with exponential backoff (3 retries, starting at 1s)',
          'Consider implementing a circuit breaker pattern for this integration',
        ],
        similarIssues: [
          {
            id: 'ERR-2024-098',
            workflow: 'Order Sync',
            resolution: 'Increased timeout to 60s and added retry with backoff',
          },
          {
            id: 'ERR-2024-045',
            workflow: 'Customer Import',
            resolution: 'External API was down, resolved after vendor fix',
          },
        ],
        tokenUsage: 1500,
      },
    });
    console.log('AI Analysis created for HTTP Timeout error');

    // 6. Create RCA Analysis for first error
    await prisma.rCAAnalysis.create({
      data: {
        errorId: firstError.id,
        symptom: 'HTTP Request Timeout: Connection to api.example.com timed out after 30000ms',
        fiveWhysData: [
          {
            question: 'Why did the HTTP request time out?',
            answer: 'The API server took longer than 30 seconds to respond',
            evidence: 'Timeout occurred at 30,000ms, the default timeout setting',
          },
          {
            question: 'Why did the API server take so long to respond?',
            answer: 'The API was processing a large dataset query without pagination',
            evidence: 'Request was fetching all 15,000 records in a single call',
          },
          {
            question: 'Why was pagination not implemented?',
            answer: 'The original implementation assumed the dataset would remain small',
            evidence: 'Workflow was created 6 months ago when dataset had ~500 records',
          },
          {
            question: 'Why was there no monitoring for dataset growth?',
            answer: 'No alerting was set up for data volume thresholds',
            evidence: 'No data volume monitoring exists in current workflow',
          },
        ],
        rootCause: 'Missing pagination and data volume monitoring led to unbounded query as dataset grew from 500 to 15,000 records over 6 months.',
        gapAnalysisData: [
          { name: 'Pagination', existed: false, whyMissed: 'Not implemented in original design' },
          { name: 'Request Timeout Handling', existed: false, whyMissed: 'No retry logic or fallback' },
          { name: 'Data Volume Monitoring', existed: false, whyMissed: 'Growth not anticipated' },
          { name: 'Performance Testing', existed: true, whyMissed: 'Only tested with small datasets' },
        ],
        quickWins: [
          {
            title: 'Increase timeout to 60 seconds',
            description: 'Immediate fix to prevent failures while implementing proper pagination',
            effort: 'quick_win',
            priority: 1,
          },
          {
            title: 'Add retry with exponential backoff',
            description: "Use n8n's built-in retry settings with 3 attempts",
            effort: 'quick_win',
            priority: 2,
          },
        ],
        mediumTerm: [
          {
            title: 'Implement pagination',
            description: 'Add limit/offset or cursor-based pagination to fetch data in batches of 100',
            effort: 'medium_term',
            nodeChanges: ['HTTP Request node configuration'],
            priority: 1,
          },
          {
            title: 'Add SplitInBatches node',
            description: 'Process records in chunks to avoid memory issues',
            effort: 'medium_term',
            priority: 2,
          },
        ],
        longTerm: [
          {
            title: 'Set up data volume monitoring',
            description: 'Create a scheduled workflow that monitors dataset size and alerts when thresholds are exceeded',
            effort: 'long_term',
            priority: 1,
          },
          {
            title: 'Implement caching layer',
            description: 'Cache frequently accessed data to reduce API load',
            effort: 'long_term',
            priority: 2,
          },
        ],
        errorCategory: 'Connection',
        errorPattern: 'ETIMEDOUT',
        confidence: 85,
        dataSource: 'live',
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        skillsUsed: ['SKILL', 'FIVE_WHYS', 'ERROR_CATALOG'],
        tokenUsage: 2500,
      },
    });
    console.log('RCA Analysis created for HTTP Timeout error');
  }

  // Create AI Analysis for second error (Database connection)
  const secondError = errors.find(e => e.workflowN8nId === 'wf-002' && e.hasAIAnalysis);
  if (secondError) {
    await prisma.aIAnalysis.create({
      data: {
        errorId: secondError.id,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        confidence: 87,
        rootCause: 'Database connection pool exhaustion due to long-running queries blocking available connections.',
        suggestedFix: [
          'Check database server health and connection limits',
          'Review recent changes to database queries',
          'Implement connection pooling with proper timeout settings',
          'Add connection retry logic with exponential backoff',
        ],
        similarIssues: [
          {
            id: 'ERR-2024-112',
            workflow: 'Inventory Update',
            resolution: 'Increased connection pool size and added query timeout',
          },
        ],
        tokenUsage: 1200,
      },
    });
    console.log('AI Analysis created for Database connection error');
  }

  // Create AI Analysis for fourth error (Invalid JSON)
  const fourthError = errors.find(e => e.workflowN8nId === 'wf-001' && e.hasAIAnalysis);
  if (fourthError) {
    await prisma.aIAnalysis.create({
      data: {
        errorId: fourthError.id,
        provider: 'anthropic',
        model: 'claude-sonnet-4-20250514',
        confidence: 78,
        rootCause: 'External API returned HTML error page instead of expected JSON due to server-side error.',
        suggestedFix: [
          'Add response content-type validation before parsing',
          'Implement error handling for non-JSON responses',
          'Contact API provider about intermittent errors',
          'Add retry logic for transient failures',
        ],
        similarIssues: [],
        tokenUsage: 900,
      },
    });
    console.log('AI Analysis created for Invalid JSON error');
  }

  console.log('\nDemo data seeding complete!');
  console.log(`\nDemo account credentials:`);
  console.log(`  Email: ${DEMO_EMAIL}`);
  console.log(`  Password: ${DEMO_PASSWORD}`);
  console.log(`\nNote: The demo account is READ-ONLY and cannot modify data.`);
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

# n8n Health Monitoring Dashboard - Design Plan

## Overview
A self-hosted dashboard for monitoring multiple n8n instances with AI-powered error analysis.

**Scale:** 20+ servers, 500+ workflows
**Connectivity:** API polling + webhook push (real-time)
**AI:** Multiple providers (OpenAI, Claude, Local LLMs)

---

## Recommended Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 15** | React framework with App Router, server components |
| **TypeScript** | Type safety and better DX |
| **TailwindCSS** | Utility-first styling |
| **shadcn/ui** | Beautiful, accessible component library |
| **Tremor** | Dashboard charts & data visualization |
| **TanStack Query** | Data fetching, caching, real-time sync |

### Backend
| Technology | Purpose |
|------------|---------|
| **Next.js API Routes** | API endpoints (unified deployment) |
| **PostgreSQL** | Primary database (scales well) |
| **Redis** | Caching, real-time pub/sub, rate limiting |
| **BullMQ** | Job queues for scheduled polling |
| **Socket.io** | Real-time updates to dashboard |

### AI Integration
| Technology | Purpose |
|------------|---------|
| **Vercel AI SDK** | Unified API for multiple AI providers |
| **OpenAI/Claude/Ollama** | Flexible provider support |

### Deployment
| Technology | Purpose |
|------------|---------|
| **Docker Compose** | Self-hosted orchestration |
| **Nginx** | Reverse proxy, SSL |
| **Let's Encrypt** | Free SSL certificates |

---

## MVP Features (Phase 1)

### 1. Server Management
- [ ] Add/remove n8n server connections
- [ ] Store API credentials securely
- [ ] Connection health status indicator

### 2. Dashboard Overview
- [ ] All servers at a glance (grid view)
- [ ] Server status cards (online/offline/degraded)
- [ ] Key metrics: total workflows, active, failed executions

### 3. Workflow Monitoring
- [ ] List all workflows across servers
- [ ] Execution status (success/error/running)
- [ ] Recent execution history

### 4. Error Tracking
- [ ] Failed execution log
- [ ] Error details and stack traces
- [ ] Filter by server/workflow/time

### 5. Basic AI Analysis
- [ ] "Analyze Error" button on failed executions
- [ ] AI-generated error explanation
- [ ] Suggested resolution steps

---

## Phase 2 Features (Future)
- Real-time alerts (email, Slack, Discord)
- Workflow performance analytics
- AI-powered anomaly detection
- Team collaboration (comments, assignments)
- Custom dashboards and widgets
- API for external integrations

---

## File Structure (Proposed)

```
n8n-health-dashboard/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (dashboard)/        # Dashboard routes
│   │   │   ├── page.tsx        # Main dashboard
│   │   │   ├── servers/        # Server management
│   │   │   ├── workflows/      # Workflow monitoring
│   │   │   └── errors/         # Error tracking
│   │   ├── api/                # API routes
│   │   │   ├── servers/        # Server CRUD
│   │   │   ├── n8n/            # n8n proxy endpoints
│   │   │   ├── webhooks/       # Webhook receivers
│   │   │   └── ai/             # AI analysis endpoints
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn components
│   │   ├── dashboard/          # Dashboard widgets
│   │   └── charts/             # Tremor charts
│   ├── lib/
│   │   ├── n8n-client.ts       # n8n API client
│   │   ├── ai-providers.ts     # AI provider abstraction
│   │   ├── db.ts               # Database client
│   │   └── redis.ts            # Redis client
│   └── types/
│       └── index.ts            # TypeScript types
├── prisma/
│   └── schema.prisma           # Database schema
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Database Schema (Core Tables)

```prisma
model Server {
  id          String   @id @default(cuid())
  name        String
  url         String
  apiKey      String   @db.Text  // encrypted
  status      Status   @default(UNKNOWN)
  lastChecked DateTime?
  workflows   Workflow[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Workflow {
  id          String   @id @default(cuid())
  n8nId       String
  name        String
  active      Boolean
  serverId    String
  server      Server   @relation(fields: [serverId], references: [id])
  executions  Execution[]
}

model Execution {
  id          String   @id @default(cuid())
  n8nId       String
  workflowId  String
  workflow    Workflow @relation(fields: [workflowId], references: [id])
  status      ExecStatus
  startedAt   DateTime
  finishedAt  DateTime?
  error       String?  @db.Text
  aiAnalysis  String?  @db.Text
}

enum Status {
  ONLINE
  OFFLINE
  DEGRADED
  UNKNOWN
}

enum ExecStatus {
  SUCCESS
  ERROR
  RUNNING
  WAITING
}
```

---

## Wireframe Mockups

### Main Dashboard
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🔧 n8n Health Dashboard                    [Search...]     [⚙️] [👤 User]  │
├─────────────┬───────────────────────────────────────────────────────────────┤
│             │                                                               │
│  📊 Overview│  OVERVIEW                                          [+ Server] │
│             │  ─────────────────────────────────────────────────────────── │
│  🖥️ Servers │                                                               │
│             │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌──────────┐│
│  ⚡ Workflows│  │  🟢 24      │ │  🔴 3       │ │  🟡 2       │ │ 847      ││
│             │  │  Online     │ │  Failed     │ │  Degraded   │ │ Workflows││
│  ❌ Errors   │  │  Servers    │ │  Today      │ │  Servers    │ │ Total    ││
│             │  └─────────────┘ └─────────────┘ └─────────────┘ └──────────┘│
│  🤖 AI Help │                                                               │
│             │  SERVERS                                                      │
│  ──────────│  ───────────────────────────────────────────────────────────  │
│             │  ┌─────────────────────┐ ┌─────────────────────┐              │
│  Settings   │  │ 🟢 Production-US    │ │ 🟢 Production-EU    │              │
│             │  │ ████████░░ 82%      │ │ █████████░ 91%      │              │
│             │  │ 156 workflows       │ │ 203 workflows       │              │
│             │  │ 2 errors today      │ │ 0 errors today      │              │
│             │  │ Last: 30s ago       │ │ Last: 45s ago       │              │
│             │  └─────────────────────┘ └─────────────────────┘              │
│             │                                                               │
│             │  ┌─────────────────────┐ ┌─────────────────────┐              │
│             │  │ 🔴 Staging          │ │ 🟢 Client-A         │              │
│             │  │ ░░░░░░░░░░ OFFLINE  │ │ ██████░░░░ 67%      │              │
│             │  │ 45 workflows        │ │ 89 workflows        │              │
│             │  │ Connection failed   │ │ 1 error today       │              │
│             │  │ Last: 5m ago        │ │ Last: 1m ago        │              │
│             │  └─────────────────────┘ └─────────────────────┘              │
│             │                                                               │
│             │  RECENT ERRORS                                    [View All] │
│             │  ───────────────────────────────────────────────────────────  │
│             │  ┌───────────────────────────────────────────────────────────┐│
│             │  │ ⚠️ HTTP Request Failed - Production-US                    ││
│             │  │ Workflow: Customer Sync  │  10:32 AM  │ [🤖 Analyze]      ││
│             │  ├───────────────────────────────────────────────────────────┤│
│             │  │ ⚠️ Database Connection Timeout - Client-A                 ││
│             │  │ Workflow: Order Process  │  09:15 AM  │ [🤖 Analyze]      ││
│             │  └───────────────────────────────────────────────────────────┘│
└─────────────┴───────────────────────────────────────────────────────────────┘
```

### Error Details with AI Analysis
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Back to Errors                                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ERROR DETAILS                                                              │
│  ═══════════════════════════════════════════════════════════════════════   │
│                                                                             │
│  Server:    Production-US                                                   │
│  Workflow:  Customer Sync (ID: 1234)                                        │
│  Node:      HTTP Request                                                    │
│  Time:      Dec 20, 2025 10:32:14 AM                                       │
│  Duration:  30.2s                                                           │
│                                                                             │
│  ┌─ Error Message ──────────────────────────────────────────────────────┐  │
│  │ ETIMEDOUT: Connection timed out after 30000ms                        │  │
│  │ at ClientRequest.<anonymous> (/usr/local/lib/node_modules/...)       │  │
│  │ at Object.onceWrapper (node:events:628:26)                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ 🤖 AI Analysis ─────────────────────────────────────────────────────┐  │
│  │                                                                       │  │
│  │  **Root Cause:**                                                     │  │
│  │  The external API at api.example.com is not responding within the    │  │
│  │  configured timeout period (30s).                                    │  │
│  │                                                                       │  │
│  │  **Suggested Fixes:**                                                │  │
│  │  1. Check if api.example.com is experiencing downtime               │  │
│  │  2. Increase timeout in HTTP Request node to 60s                    │  │
│  │  3. Add retry logic with exponential backoff                        │  │
│  │  4. Implement circuit breaker pattern for this endpoint             │  │
│  │                                                                       │  │
│  │  **Similar Issues:** Found 3 similar errors in the last 7 days      │  │
│  │                                                                       │  │
│  │  [📋 Copy Solution]  [🔄 Re-analyze]  [💬 Ask Follow-up]             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  [← Previous Error]                              [Next Error →]             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Add Server Modal
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│         ┌─────────────────────────────────────────────────────┐             │
│         │  Add New n8n Server                           [✕]   │             │
│         ├─────────────────────────────────────────────────────┤             │
│         │                                                     │             │
│         │  Server Name                                        │             │
│         │  ┌─────────────────────────────────────────────┐   │             │
│         │  │ Production-Asia                             │   │             │
│         │  └─────────────────────────────────────────────┘   │             │
│         │                                                     │             │
│         │  n8n URL                                            │             │
│         │  ┌─────────────────────────────────────────────┐   │             │
│         │  │ https://n8n.asia.company.com                │   │             │
│         │  └─────────────────────────────────────────────┘   │             │
│         │                                                     │             │
│         │  API Key                                            │             │
│         │  ┌─────────────────────────────────────────────┐   │             │
│         │  │ ••••••••••••••••••••••••                    │   │             │
│         │  └─────────────────────────────────────────────┘   │             │
│         │                                                     │             │
│         │  ☑️ Enable real-time monitoring                     │             │
│         │  ☐ Receive webhook events                          │             │
│         │                                                     │             │
│         │          [Cancel]  [🔗 Test Connection]  [Save]     │             │
│         │                                                     │             │
│         └─────────────────────────────────────────────────────┘             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Color Scheme & Design

**Theme:** Dark mode primary (with light mode option)

| Element | Color |
|---------|-------|
| Background | `#0f0f14` (deep navy black) |
| Cards | `#1a1a1a` with subtle border |
| Primary | `#6366f1` (Indigo) |
| Success | `#22c55e` (Green) |
| Warning | `#f59e0b` (Amber) |
| Error | `#ef4444` (Red) |
| Text | `#fafafa` (White) |
| Muted | `#71717a` (Gray) |

**Design Principles:**
- Clean, minimal interface
- High contrast for readability
- Status colors consistent throughout
- Generous whitespace
- Smooth animations for state changes

---

## Implementation Phases

### Phase 1: MVP (Week 1-2)
1. Project scaffolding with Next.js 15
2. Database setup with Prisma + PostgreSQL
3. Basic server management (CRUD)
4. n8n API integration
5. Dashboard overview page
6. Basic error listing

### Phase 2: AI Integration (Week 3)
1. AI provider abstraction layer
2. Error analysis endpoint
3. Analysis UI components
4. Caching for AI responses

### Phase 3: Real-time & Polish (Week 4)
1. Webhook receiver endpoints
2. Real-time updates with Socket.io
3. UI polish and animations
4. Docker deployment setup

---

## Next Steps
1. ✅ Tech stack defined
2. ✅ Wireframes created
3. ⏳ Confirm design direction
4. Set up project scaffolding
5. Implement MVP features iteratively


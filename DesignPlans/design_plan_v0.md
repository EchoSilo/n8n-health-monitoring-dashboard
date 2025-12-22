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
| **Material UI (MUI) v6** | Complete React component library |
| **MUI X DataGrid** | Advanced data tables (sorting, filtering, virtual scroll) |
| **MUI X Charts** | Dashboard charts & data visualization |
| **TanStack Query** | Data fetching, caching, real-time sync |
| **Emotion** | CSS-in-JS (included with MUI) |

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

## Wireframe Comparison: Original vs MagicPatterns

### Key UX Improvements from MagicPatterns (Adopting)

| Feature | Original | MagicPatterns | **Recommendation** |
|---------|----------|---------------|-------------------|
| Navigation | Sidebar | Tab-based | ✅ **Tabs** - more content space |
| AI Access | Sidebar link | Floating chatbot | ✅ **Floating chatbot** - always available |
| Error Details | Full page | Slide-out drawer | ✅ **Drawer** - maintains context |
| Server Selection | Static | Click-to-filter | ✅ **Click-to-filter** - intuitive drill-down |
| Theme | Dark only | Light only | ✅ **Both** - user preference |
| Metrics | 4 basic | 4 detailed + trends | ✅ **Detailed metrics** with badges |
| AI Indicator | Button | Badge on errors | ✅ **Badge** - clearer affordance |

### Adopted Design: Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  n8n Health Dashboard                                                       │
│  Multi-Server Workflow Monitoring              [Manage Servers] [🌙] [👤]   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ [🔍 Search workflows...]  [Server ▼]  [Status ▼]  [🔄 Refresh]      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ TOTAL        │ │ ACTIVE       │ │ ERROR RATE   │ │ AVG EXEC     │       │
│  │ WORKFLOWS    │ │ EXECUTIONS   │ │              │ │ TIME         │       │
│  │   847        │ │   12         │ │   4.2%       │ │   234ms      │       │
│  │   ▲ +12%     │ │   running    │ │   ⚠ High    │ │              │       │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  [📊 Overview]  [📋 Workflows]  [⚠️ Error Logs]                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ● SERVER STATUS                                                           │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐              │
│  │ 🟢 Production-US│ │ 🟢 Production-EU│ │ 🔴 Staging      │ (clickable) │
│  │ n8n.us.co...    │ │ n8n.eu.co...    │ │ n8n.stg.co...   │              │
│  │ ─────────────── │ │ ─────────────── │ │ ─────────────── │              │
│  │ WORKFLOWS  156  │ │ WORKFLOWS  203  │ │ WORKFLOWS   45  │              │
│  │ ERRORS(24H) 2   │ │ ERRORS(24H) 0   │ │ OFFLINE         │              │
│  │ Ping: 32ms      │ │ Ping: 45ms      │ │ Connection fail │              │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘              │
│                                                                             │
│  ┌─────────────────────────────────────┐ ┌─────────────────────────────┐   │
│  │ ● ACTIVE WORKFLOWS                  │ │ ● RECENT ERRORS             │   │
│  │ ┌─────────────────────────────────┐ │ │ ┌─────────────────────────┐ │   │
│  │ │ Customer Sync    🟢 Active      │ │ │ │ ⚠️ HTTP Timeout         │ │   │
│  │ │ Production-US    234ms          │ │ │ │ Customer Sync • 10:32  │ │   │
│  │ ├─────────────────────────────────┤ │ │ │ ✨ AI Analysis Ready    │ │   │
│  │ │ Order Process    🟡 Running     │ │ │ ├─────────────────────────┤ │   │
│  │ │ Client-A         1.2s           │ │ │ │ 🔴 DB Connection Lost   │ │   │
│  │ └─────────────────────────────────┘ │ │ │ Order Sync • 09:15     │ │   │
│  │                      [View All →]   │ │ │ ✨ AI Analysis Ready    │ │   │
│  └─────────────────────────────────────┘ │ └─────────────────────────┘ │   │
│                                          │              [View All →]   │   │
│                                          └─────────────────────────────┘   │
│                                                                             │
│                                                           ┌───────────────┐│
│                                                           │ 💬 AI         ││
│                                                           │    Assistant  ││
│                                                           └───────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### AI Analysis Drawer (Slides in from Right)
```
                                        ┌─────────────────────────────────────┐
                                        │ ← ERROR DETAILS              [✕]   │
                                        ├─────────────────────────────────────┤
                                        │ 🔴 critical    ERR-2024-001        │
                                        │                                     │
                                        │ HTTP Request Timeout                │
                                        │                                     │
                                        │ Workflow: Customer Sync             │
                                        │ Server: Production-US               │
                                        │ Time: Dec 20, 2025 10:32 AM         │
                                        ├─────────────────────────────────────┤
                                        │ ✨ AI ROOT CAUSE ANALYSIS           │
                                        │    ────────────────────             │
                                        │    Confidence: 94%                  │
                                        │                                     │
                                        │ SUGGESTED RESOLUTION:               │
                                        │ ① Check api.example.com status      │
                                        │ ② Increase timeout to 60s           │
                                        │ ③ Add retry with backoff            │
                                        │                                     │
                                        │ SIMILAR PAST ISSUES:                │
                                        │ ┌─────────────────────────────────┐ │
                                        │ │ ✓ ERR-2024-098 (Order Sync)    │ │
                                        │ │   Resolved: Increased timeout  │ │
                                        │ └─────────────────────────────────┘ │
                                        ├─────────────────────────────────────┤
                                        │ STACK TRACE                  [Copy] │
                                        │ ┌─────────────────────────────────┐ │
                                        │ │ ETIMEDOUT: Connection timed    │ │
                                        │ │ out after 30000ms              │ │
                                        │ │ at ClientRequest.<anonymous>   │ │
                                        │ └─────────────────────────────────┘ │
                                        ├─────────────────────────────────────┤
                                        │ [Close] [Open in n8n] [✓ Resolved] │
                                        └─────────────────────────────────────┘
```

### Floating AI Chatbot (Bottom Right)
```
┌─────────────────────────────────────────┐
│ 🤖 n8n AI Assistant              [─][✕] │
│ Ask about your dashboard                │
├─────────────────────────────────────────┤
│                                         │
│ 🤖 Hi! I'm your n8n AI assistant.      │
│    Ask me about workflows, servers,     │
│    or errors.                           │
│                                         │
│                        ┌───────────────┐│
│                        │ How many      ││
│                        │ servers are   ││
│                        │ online?    👤 ││
│                        └───────────────┘│
│                                         │
│ 🤖 You have 3 servers connected:       │
│    • Production-US (online)             │
│    • Production-EU (online)             │
│    • Staging (offline)                  │
│                                         │
├─────────────────────────────────────────┤
│ [Ask about workflows, servers...]  [➤] │
└─────────────────────────────────────────┘
```

### Manage Servers Dialog (Enhanced from MagicPatterns)
```
┌─────────────────────────────────────────────────────────────┐
│ 🖥️ Manage n8n Servers                                  [✕]  │
│ Add or remove server connections and manage API credentials │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─ + ADD NEW SERVER ──────────────────────────────────────┐ │
│ │                                                         │ │
│ │  Server Name              Server URL                    │ │
│ │  ┌───────────────────┐    ┌─────────────────────────┐  │ │
│ │  │ Production-Asia   │    │ https://n8n.asia.co...  │  │ │
│ │  └───────────────────┘    └─────────────────────────┘  │ │
│ │                                                         │ │
│ │  🔐 API Key                                             │ │
│ │  ┌─────────────────────────────────────────────────┐   │ │
│ │  │ ••••••••••••••••••••••••••••                    │   │ │
│ │  └─────────────────────────────────────────────────┘   │ │
│ │  ℹ️ Your API key is stored securely and encrypted.     │ │
│ │                                                         │ │
│ │  Advanced Options ▼                                     │ │
│ │  ┌─────────────────────────────────────────────────┐   │ │
│ │  │ Polling Interval:  [30 seconds ▼]               │   │ │
│ │  │ ☑️ Enable webhook receiver                       │   │ │
│ │  │ ☐ Skip SSL verification (dev only)              │   │ │
│ │  └─────────────────────────────────────────────────┘   │ │
│ │                                                         │ │
│ │               [🔗 Test Connection]  [+ Add Server]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ CONNECTED SERVERS                                      [3]  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 🟢 Production-US                              [✏️] [🗑️] │ │
│ │    https://n8n.us.company.com • 156 workflows           │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🟢 Production-EU                              [✏️] [🗑️] │ │
│ │    https://n8n.eu.company.com • 203 workflows           │ │
│ ├─────────────────────────────────────────────────────────┤ │
│ │ 🔴 Staging (offline)                          [✏️] [🗑️] │ │
│ │    https://n8n.staging.company.com • 45 workflows       │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                    [Close]  │
└─────────────────────────────────────────────────────────────┘
```

**Improvements over MagicPatterns:**
- ✅ Test Connection button (validates before adding)
- ✅ Edit button per server (not just delete)
- ✅ Advanced options (polling interval, webhooks, SSL)
- ✅ Workflow count shown per server

### Settings Modal
```
┌─────────────────────────────────────────────────────────────┐
│ ⚙️ Settings                                            [✕]  │
├───────────────┬─────────────────────────────────────────────┤
│               │                                             │
│  General      │  APPEARANCE                                 │
│  ────────     │  ─────────────────────────────────────────  │
│  AI Provider  │                                             │
│  ────────     │  Theme                                      │
│  Notifications│  ○ Light  ○ Dark  ● System                  │
│  ────────     │                                             │
│  Data & Logs  │  Compact Mode                               │
│               │  ☐ Use compact table rows                   │
│               │                                             │
│               │  ─────────────────────────────────────────  │
│               │  DASHBOARD                                  │
│               │  ─────────────────────────────────────────  │
│               │                                             │
│               │  Default Tab                                │
│               │  [Overview ▼]                               │
│               │                                             │
│               │  Auto-refresh Interval                      │
│               │  [30 seconds ▼]                             │
│               │                                             │
│               │  Show Offline Servers                       │
│               │  ● Yes  ○ No                                │
│               │                                             │
├───────────────┼─────────────────────────────────────────────┤
│               │                                             │
│  AI Provider  │  AI CONFIGURATION                           │
│  (selected)   │  ─────────────────────────────────────────  │
│               │                                             │
│               │  Primary Provider                           │
│               │  ┌─────────────────────────────────────┐   │
│               │  │ ● OpenAI (GPT-4)                    │   │
│               │  │ ○ Anthropic (Claude)                │   │
│               │  │ ○ Local (Ollama)                    │   │
│               │  └─────────────────────────────────────┘   │
│               │                                             │
│               │  OpenAI API Key                             │
│               │  ┌─────────────────────────────────────┐   │
│               │  │ sk-••••••••••••••••••••            │   │
│               │  └─────────────────────────────────────┘   │
│               │                                             │
│               │  Model                                      │
│               │  [gpt-4-turbo ▼]                            │
│               │                                             │
│               │  ☑️ Cache AI responses (saves costs)        │
│               │  ☑️ Include similar past issues             │
│               │                                             │
├───────────────┼─────────────────────────────────────────────┤
│               │                                             │
│  Notifications│  NOTIFICATION CHANNELS                      │
│  (selected)   │  ─────────────────────────────────────────  │
│               │                                             │
│               │  ☑️ Email Alerts                            │
│               │     └─ team@company.com                     │
│               │                                             │
│               │  ☐ Slack Webhook                            │
│               │     └─ [Configure...]                       │
│               │                                             │
│               │  ☐ Discord Webhook                          │
│               │     └─ [Configure...]                       │
│               │                                             │
│               │  ALERT THRESHOLDS                           │
│               │  ─────────────────────────────────────────  │
│               │                                             │
│               │  Notify when error rate exceeds:            │
│               │  [5] %                                      │
│               │                                             │
│               │  Notify when server offline for:            │
│               │  [2] minutes                                │
│               │                                             │
├───────────────┴─────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]       │
└─────────────────────────────────────────────────────────────┘
```

### User Profile Dropdown
```
┌──────────────────────────────────────────────┐
│  👤 Jamal Ahmed                         ▼    │
└──────────────────────────────────────────────┘
                    │
                    ▼
        ┌───────────────────────────────┐
        │  ┌────┐                       │
        │  │ JA │  Jamal Ahmed          │
        │  └────┘  jamal@company.com    │
        │          Admin                │
        ├───────────────────────────────┤
        │  👤 My Profile                │
        │  🔔 Notification Preferences  │
        │  🔑 API Keys                  │
        ├───────────────────────────────┤
        │  👥 Team Members              │
        │  📊 Usage & Billing           │
        ├───────────────────────────────┤
        │  📚 Documentation             │
        │  💬 Support                   │
        ├───────────────────────────────┤
        │  🚪 Sign Out                  │
        └───────────────────────────────┘

### My Profile Page/Modal
┌─────────────────────────────────────────────────────────────┐
│ 👤 My Profile                                          [✕]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│        ┌──────────┐                                         │
│        │          │  [Change Photo]                         │
│        │    JA    │                                         │
│        │          │                                         │
│        └──────────┘                                         │
│                                                             │
│  Full Name                                                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Jamal Ahmed                                         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Email                                                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ jamal@company.com                      (via Google) │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Role                                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Admin                                               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  CONNECTED ACCOUNTS                                         │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  🔗 Google      jamal@company.com           [Connected ✓]   │
│  🔗 GitHub      @jamalahmed                 [Connect]       │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  DANGER ZONE                                                │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [🗑️ Delete Account]                                        │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                              [Cancel]  [Save Changes]       │
└─────────────────────────────────────────────────────────────┘
```

### Team Members Page (Admin only)
```
┌─────────────────────────────────────────────────────────────┐
│ 👥 Team Members                              [+ Invite]     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 🔍 Search members...                                    ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  NAME                    EMAIL                 ROLE    ACT  │
│  ───────────────────────────────────────────────────────── │
│  ┌────┐                                                     │
│  │ JA │ Jamal Ahmed      jamal@co...     Admin    [···]    │
│  └────┘                                        (You)       │
│  ───────────────────────────────────────────────────────── │
│  ┌────┐                                                     │
│  │ SK │ Sarah Kim        sarah@co...     Member   [···]    │
│  └────┘                                                     │
│  ───────────────────────────────────────────────────────── │
│  ┌────┐                                                     │
│  │ MJ │ Mike Johnson     mike@co...      Viewer   [···]    │
│  └────┘                                                     │
│                                                             │
│  PENDING INVITES                                            │
│  ───────────────────────────────────────────────────────── │
│  📧 alex@company.com               Invited 2 days ago      │
│                                    [Resend] [Cancel]        │
│                                                             │
└─────────────────────────────────────────────────────────────┘

Roles:
- Admin: Full access, manage team, settings
- Member: View all, manage servers, use AI
- Viewer: View only, no modifications
```

---

## Color Scheme & Design

**Theme:** Light/Dark mode toggle (system preference default)

### Light Mode (Default - Apple-inspired)
| Element | Color |
|---------|-------|
| Background | `#f5f5f7` (light gray) |
| Cards | `#ffffff` with dashed border |
| Primary | `#1f2933` (near black) |
| Accent | `#6366f1` (Indigo) |
| Success | `#22c55e` (Green) |
| Warning | `#f59e0b` (Amber) |
| Error | `#ef4444` (Red) |
| Text | `#1f2933` (dark gray) |
| Muted | `#6b7280` (gray) |
| AI Accent | `#a855f7` (Purple) |

### Dark Mode
| Element | Color |
|---------|-------|
| Background | `#0f0f0f` (near black) |
| Cards | `#1a1a1a` with subtle border |
| Primary | `#fafafa` (white) |
| Accent | `#818cf8` (Light Indigo) |
| Success | `#4ade80` (Light Green) |
| Warning | `#fbbf24` (Light Amber) |
| Error | `#f87171` (Light Red) |
| Text | `#fafafa` (white) |
| Muted | `#9ca3af` (light gray) |
| AI Accent | `#c084fc` (Light Purple) |

**Design Principles (from MagicPatterns):**
- Clean, minimal interface with generous whitespace
- Dashed borders for cards (wireframe/blueprint aesthetic)
- Monospace fonts for technical data (IDs, URLs, times)
- Status colors consistent throughout
- Smooth animations for state changes
- Click-to-filter interactions on server cards
- Contextual drawers over full-page navigation

---

## MUI Component Mapping

| Wireframe Element | MUI Component | Notes |
|-------------------|---------------|-------|
| Main Dashboard | `Box`, `Container` | Layout with `sx` prop |
| Metric Cards | `Card`, `CardContent` | With `Typography` for labels |
| Navigation Tabs | `Tabs`, `Tab`, `TabPanel` | Overview/Workflows/Errors |
| Server Grid | `Grid2` + `Card` | Responsive 4-column layout |
| Workflow Table | `DataGrid` (MUI X) | Sorting, filtering, pagination |
| Error List | `List`, `ListItem`, `ListItemText` | With `Chip` for severity |
| AI Drawer | `Drawer` | Anchor right, persistent |
| AI Chatbot | `Fab` + `Card` | Floating action button trigger |
| Settings Dialog | `Dialog` + `Tabs` | Full-screen on mobile |
| Server Dialog | `Dialog` | With `TextField`, `Switch` |
| Profile Menu | `Menu`, `MenuItem`, `Avatar` | Dropdown from header |
| Filter Bar | `TextField`, `Select`, `IconButton` | With `InputAdornment` |
| Status Badges | `Chip` | Color variants for status |
| Theme Toggle | `IconButton` + `useColorScheme` | MUI built-in dark mode |

### MUI Theme Configuration

```typescript
// theme/theme.ts
import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1f2933' },
        secondary: { main: '#6366f1' },
        success: { main: '#22c55e' },
        warning: { main: '#f59e0b' },
        error: { main: '#ef4444' },
        background: { default: '#f5f5f7', paper: '#ffffff' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#fafafa' },
        secondary: { main: '#818cf8' },
        success: { main: '#4ade80' },
        warning: { main: '#fbbf24' },
        error: { main: '#f87171' },
        background: { default: '#0f0f0f', paper: '#1a1a1a' },
      },
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
    // Monospace for technical data
    mono: { fontFamily: '"JetBrains Mono", monospace' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12 },
      },
    },
  },
});
```

---

## Implementation Approach

### Strategy: Build Fresh with MUI

Since we're using Material UI, we'll build components from scratch using MUI primitives rather than migrating the MagicPatterns Tailwind code. This approach gives us:

- **Consistent theming** - Built-in light/dark mode with `ThemeProvider`
- **Better data handling** - MUI X DataGrid for workflow tables
- **Accessible components** - MUI follows WAI-ARIA standards
- **Faster development** - Less custom CSS, more pre-built components

### Phase 1: Foundation (MVP Core)
1. Set up Next.js 15 project with App Router + MUI
2. Configure MUI theme (light/dark mode)
3. Build core components (Dashboard, ServerGrid, MetricsCards)
4. Add Prisma + PostgreSQL database
5. Implement server CRUD (add/remove/edit)
6. Connect to n8n API for workflow data
7. Basic authentication (NextAuth.js with Google/GitHub)

### Phase 2: AI Integration
1. AI provider abstraction (OpenAI, Claude, Ollama)
2. Error analysis endpoint with streaming
3. AI chatbot backend (real responses)
4. Analysis caching for cost savings

### Phase 3: Real-time & Polish
1. Webhook receiver for n8n events
2. Real-time updates (Server-Sent Events or Socket.io)
3. Dark mode implementation
4. Docker deployment setup

---

## Files to Create (MVP)

```
src/
├── app/
│   ├── page.tsx                    # Dashboard (from MagicPatterns)
│   ├── layout.tsx                  # Root layout with providers
│   ├── api/
│   │   ├── servers/route.ts        # Server CRUD
│   │   ├── n8n/[serverId]/
│   │   │   ├── workflows/route.ts  # Proxy to n8n
│   │   │   └── executions/route.ts
│   │   ├── ai/
│   │   │   ├── analyze/route.ts    # Error analysis
│   │   │   └── chat/route.ts       # Chatbot
│   │   └── auth/[...nextauth]/route.ts
│   └── (auth)/
│       └── login/page.tsx
├── components/                      # Custom components using MUI
│   ├── AIAnalysisDrawer.tsx        # MUI Drawer
│   ├── AIChatbot.tsx               # MUI Card + TextField
│   ├── ServerHealthGrid.tsx        # MUI Card Grid
│   ├── WorkflowTable.tsx           # MUI X DataGrid
│   ├── ErrorLogPanel.tsx           # MUI List + ListItem
│   ├── MetricsCards.tsx            # MUI Card
│   ├── FilterBar.tsx               # MUI TextField + Select
│   ├── SettingsDialog.tsx          # MUI Dialog + Tabs
│   └── theme/                       # MUI theme customization
│       ├── theme.ts                 # Light/dark theme config
│       └── ThemeProvider.tsx        # Theme context provider
├── lib/
│   ├── n8n-client.ts               # n8n API wrapper
│   ├── ai/
│   │   ├── provider.ts             # AI provider abstraction
│   │   ├── openai.ts
│   │   ├── anthropic.ts
│   │   └── ollama.ts
│   ├── db.ts                       # Prisma client
│   └── auth.ts                     # NextAuth config
└── prisma/
    └── schema.prisma
```

---

## Docker Deployment

### Dockerfile
```dockerfile
# Dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build Next.js
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/n8n_dashboard
      - NEXTAUTH_URL=http://localhost:3000
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=n8n_dashboard
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### Files to Add for Docker
```
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
└── next.config.js          # Add: output: 'standalone'
```

---

## Development Tools & Agents

During implementation, I will leverage:

| Tool/Agent | Purpose |
|------------|---------|
| **MCP Playwright** | Visual testing, UI verification, screenshot comparisons |
| **MCP n8n-debug** | Test n8n API integration, debug workflow connections |
| **Explore Agent** | Search codebase for patterns, find files |
| **Plan Agent** | Design complex features before implementation |
| **Sequential Thinking** | Break down complex problems step-by-step |
| **Browser Tools** | Debug console errors, network issues |

---

## Next Steps
1. ✅ Tech stack defined (Next.js 15 + Material UI + MUI X)
2. ✅ Wireframes completed (Dashboard, Dialogs, Settings, Profile)
3. ✅ MUI component mapping defined
4. ✅ Theme configuration planned
5. ✅ Docker deployment configured
6. ✅ Development tools identified
7. ⏳ **Ready for implementation**


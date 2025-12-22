# n8n Health Monitoring Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)
[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)

> **One dashboard to monitor all your n8n instances.** AI-powered error analysis included.

![Dashboard](screenshots/dashboard-dark.png)

<details>
<summary>View Light Mode</summary>

![Dashboard Light Mode](screenshots/dashboard-light.png)

</details>

---

## Why This Dashboard?

If you're running multiple n8n instances, you've felt the pain of checking each one separately, hunting through UIs to find failures, and wishing someone would just tell you what went wrong.

| Feature | This Dashboard | n8n Cloud Admin | n8nDash | DIY (Datadog/Sentry) |
|---------|:-------------:|:---------------:|:-------:|:-------------------:|
| Multi-server monitoring | ✅ | ❌ | ❌ | ⚠️ Complex |
| AI error analysis | ✅ | ❌ | ❌ | ❌ |
| Self-hosted | ✅ | ❌ | ✅ | ✅ |
| Real-time metrics | ✅ | Basic | ❌ | ✅ |
| Enterprise scale (500+ workflows) | ✅ | ✅ | ❌ | ✅ |
| Cost | **Free** | Subscription | Free | $$$ |

---

## 📋 Table of Contents

- [✨ Features](#-features)
- [🚀 Quick Start](#-quick-start)
- [🐳 Docker](#-docker)
- [⚙️ Configuration](#️-configuration)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## ✨ Features

### 🖥️ Multi-Server Monitoring
Monitor **20+ n8n instances** from a single dashboard. See server health, workflow counts, and error rates at a glance. No more jumping between browser tabs.

### 🤖 AI-Powered Error Analysis
When workflows fail, get instant root cause analysis and suggested fixes. Supports **OpenAI**, **Anthropic Claude**, or **local Ollama** models—your choice.

### 📊 Real-Time Metrics
- Total workflows across all servers
- Active executions with live status
- Error rates with severity classification
- Average execution times and trends

### 🎨 Modern UI
- Dark/Light mode with glass morphism design
- Responsive layout for any screen size
- Built with Material-UI 6 components

### 🔐 Self-Hosted & Secure
Your data stays on your infrastructure. Full control over credentials and API keys. No external dependencies required.

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 16+
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/n8n-health-monitoring-dashboard.git
cd n8n-health-monitoring-dashboard/dashboard

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database connection

# Initialize database
npm run db:push
npm run db:generate

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and add your first n8n server.

---

## 🐳 Docker

```bash
cd dashboard
docker-compose up -d
```

This starts the dashboard, PostgreSQL, and Redis (optional caching).

---

## ⚙️ Configuration

### Required

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/n8n_dashboard
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
```

### Optional

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID/SECRET` | Google OAuth |
| `GITHUB_CLIENT_ID/SECRET` | GitHub OAuth |
| `OPENAI_API_KEY` | OpenAI for AI analysis |
| `ANTHROPIC_API_KEY` | Claude for AI analysis |
| `OLLAMA_BASE_URL` | Local Ollama instance |
| `REDIS_URL` | Caching & real-time |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 15.1 (App Router) |
| Language | TypeScript 5.7, React 19 |
| UI | Material-UI 6.3, MUI X Charts & Data Grid |
| Database | PostgreSQL 16, Prisma 6.1 ORM |
| Auth | NextAuth.js 4.24 |
| Data Fetching | TanStack React Query 5.62 |
| Validation | Zod 3.24 |

---

## 📁 Project Structure

```
dashboard/
├── src/
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   │   ├── dashboard/    # Dashboard widgets
│   │   └── theme/        # Theme provider
│   ├── lib/              # Utilities
│   └── types/            # TypeScript types
├── prisma/
│   └── schema.prisma     # Database schema
└── docker-compose.yml
```

---

## 🤝 Contributing

Contributions are welcome! This project is in active development.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT

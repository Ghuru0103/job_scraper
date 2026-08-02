# ⚗️ Antigravity — Apify Job Scraper Store

A production-grade job scraping platform built with **Next.js 16**, **MongoDB**, and **Redis**. Scrape LinkedIn, Indeed, Glassdoor, Remote OK, and 8+ job boards with proxy rotation, real-time monitoring, CSV export, and enterprise infrastructure.

## 🚀 Quick Start

```bash
./start.sh
```

That's it. The script auto-starts MongoDB + Redis via Docker, generates secrets, and launches the app at **http://localhost:3000**.

---

## 🛠 Technology Stack & Third-Party Services

### 🖥️ Core Framework & Language
- **[Next.js 16](https://nextjs.org/)** — Full-stack React framework with App Router, Turbopack, and API Routes
- **[React 19](https://react.dev/)** — UI Component library with hooks and server client boundaries
- **[TypeScript 5](https://www.typescriptlang.org/)** — Strict type safety across frontend and backend API endpoints
- **[Node.js 18+](https://nodejs.org/)** — Server-side JavaScript runtime environment

### 💾 Database, Caching & Queues
- **[MongoDB 6.0](https://www.mongodb.com/)** — Primary document storage (3-node Replica Set supported)
- **[Mongoose 9.9](https://mongoosejs.com/)** — ODM with schemas for Users, Actors, Scraper Runs, and Jobs
- **[Redis 7](https://redis.io/)** — In-memory data store for caching, session management, and TTL eviction
- **[ioredis 6.0](https://github.com/redis/ioredis)** — High-performance Async Redis client for Node.js
- **[Bull / BullMQ](https://docs.bullmq.io/)** — Distributed Redis background job queue for scraping tasks

### 🕷️ Scraping & Data Extraction Engines
- **[Apify SDK Client](https://docs.apify.com/sdk/js/)** — Integration with Apify platform & cloud actors
- **[Cheerio 1.2](https://cheerio.js.org/)** — Fast, flexible HTML parsing & DOM data extraction
- **[Axios 1.19](https://axios-http.com/)** — HTTP client with interceptors for raw page fetching

### 🎨 Frontend UI, Styling & Visualization
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Modern utility-first CSS framework with dark mode theme
- **[Recharts 3.10](https://recharts.org/)** — Interactive analytics charts (Area, Bar, and Donut charts)
- **[Lucide React](https://lucide.dev/)** — Modern icon set
- **[Framer Motion 12.43](https://www.framer.com/motion/)** — Micro-animations and page transitions
- **[Radix UI](https://www.radix-ui.com/)** — Accessible unstyled UI primitives (Dialog, Tabs, Tooltip, Progress, Dropdown Menu)
- **[date-fns](https://date-fns.org/)** — Date formatting and relative time helpers

### 🛡️ Security, Authentication & Utilities
- **[Helmet](https://helmetjs.github.io/)** — HTTP response header protection
- **[JSON Web Token (jsonwebtoken)](https://jwt.io/)** — Token-based session authentication
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** — Password hashing & key derivation
- **[UUID](https://github.com/uuidjs/uuid)** — RFC4122 UUID generation for runs and job records
- **[express-validator](https://express-validator.github.io/docs/)** — Request payload validation and sanitization

### 📊 Observability, Metrics & Logging
- **[Prometheus (`prom-client`)](https://prometheus.io/)** — Custom application metrics counter, gauge, and histogram
- **[Grafana](https://grafana.com/)** — System observability & visual dashboard for real-time monitoring
- **[Winston 3.19](https://github.com/winstonjs/winston)** — Structured JSON logging with daily log rotation

### 🐳 DevOps, Containerization & Infrastructure
- **[Docker & Docker Compose](https://www.docker.com/)** — Multi-stage production container setup & service orchestration
- **[Nginx](https://www.nginx.com/)** — Reverse proxy, load balancing, rate limiting, HSTS, and SSL/TLS termination

### 🌐 Third-Party External Service Integrations
- **[BrightData](https://brightdata.com/) / [Oxylabs](https://oxylabs.io/)** — Residential proxy network & IP rotation integration
- **[Amazon Web Services (AWS S3)](https://aws.amazon.com/s3/)** — Automated MongoDB backups & raw scraped payload storage
- **[SendGrid / SMTP](https://sendgrid.com/)** — Automated email alerting for scraper job failures
- **[Sentry DSN](https://sentry.io/)** — Real-time application error tracking & exception monitoring

---

## ✨ Key Features

- **8+ Job Scrapers** — LinkedIn, Indeed, Glassdoor, Remote OK, Upwork, Google Jobs, Dice, Company Careers
- **Live Analytics Dashboard** — Real-time charts (area, bar, donut) with 30s auto-refresh
- **Scraper Run Manager** — Trigger, monitor live duration, abort, or delete runs with 5s polling
- **Advanced Job Search & Filters**:
  - Filter by Company & Location search
  - Filter by Experience Level (Entry, Mid, Senior, Lead, Executive)
  - Filter by Salary Threshold ($60k+, $80k+, $100k+, $120k+, $150k+)
  - Filter by Posted Date (Last 24h, Last 3 days, Past 7 days, Past 15 days, Past 1 month)
  - Remote Job Toggle & Clear Filters
- **One-Click CSV Export** — Download filtered job results as formatted `.csv` files
- **Graceful Fallback Mode** — Works out-of-the-box in demo mode without MongoDB/Redis dependencies
- **Production Monitoring** — Health checks, Prometheus alert rules, endpoint ping tester

---

## 📁 Project Structure

```
src/
├── app/
│   ├── api/          # REST endpoints (actors, runs, jobs, jobs/export, stats, health, metrics)
│   ├── dashboard/    # Analytics dashboard page
│   ├── jobs/         # Job results browser with search & CSV export
│   ├── monitoring/   # Health & Prometheus monitoring page
│   └── runs/         # Scraper run manager page
├── components/       # ActorCard, RunCard, Navbar
├── lib/              # db.ts, redis.ts, logger.ts, metrics.ts
└── models/           # User, Actor, Run, Job (Mongoose schemas)
```

---

## 🐳 Full Stack (with Monitoring)

```bash
docker compose up -d
```

Starts: App (3 replicas) · MongoDB replica set · Redis · Nginx · Prometheus · Grafana

| Service | URL | Default Credentials |
|---------|-----|--------------------|
| Next.js App | http://localhost:3000 | — |
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | — |

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and fill in values. Key variables:

```env
MONGODB_URI=mongodb://localhost:27017/antigravity
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate with: openssl rand -base64 32>
ENCRYPTION_KEY=<generate with: openssl rand -hex 32>
```

See `.env.example` for the full reference.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/actors` | List available scrapers |
| POST | `/api/runs` | Trigger a scraper run |
| GET | `/api/runs` | List recent scraper runs |
| GET | `/api/jobs` | Paginated & filtered job search |
| GET | `/api/jobs/export` | Download filtered jobs in CSV format |
| GET | `/api/stats` | Analytics dashboard data |
| GET | `/api/health` | MongoDB + Redis connection status |
| GET | `/api/metrics` | Prometheus metrics scrape endpoint |

---

## 🛑 Stop

```bash
npm run stop        # Stop Docker containers
docker compose down # Stop full stack
```

# ⚗️ Antigravity — Apify Job Scraper Store

A production-grade job scraping platform built with **Next.js 16**, **MongoDB**, and **Redis**. Scrape LinkedIn, Indeed, Glassdoor, Remote OK, and 8+ job boards with proxy rotation, real-time monitoring, and enterprise infrastructure.

## 🚀 Quick Start

```bash
./start.sh
```

That's it. The script auto-starts MongoDB + Redis via Docker, generates secrets, and launches the app at **http://localhost:3000**.

## ✨ Features

- **8+ Scrapers** — LinkedIn, Indeed, Glassdoor, Remote OK, Upwork, Google Jobs, Dice, Company Sites
- **Live Dashboard** — Real-time charts (area, bar, donut) with 30s auto-refresh
- **Run Management** — Start, monitor, abort, and delete scraper runs with 5s live updates
- **Job Results** — Grid/table view with filters, salary, skills, remote toggle, and detail modal
- **Monitoring** — Health checks for MongoDB + Redis, Prometheus metrics, endpoint latency tester
- **Redis Caching** — API response caching with TTL to minimize DB load
- **Prometheus Metrics** — HTTP request rates, scraper durations, cache hits, queue depth

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router, Turbopack) |
| Database | MongoDB + Mongoose (replica set ready) |
| Cache | Redis (ioredis) |
| Metrics | Prometheus (prom-client) |
| Logging | Winston |
| Charts | Recharts |
| Infra | Docker, Nginx, Grafana |

## 📁 Project Structure

```
src/
├── app/
│   ├── api/          # REST endpoints (actors, runs, jobs, stats, health, metrics)
│   ├── dashboard/    # Analytics dashboard
│   ├── jobs/         # Job results browser
│   ├── monitoring/   # Health & Prometheus monitoring
│   └── runs/         # Scraper run manager
├── components/       # ActorCard, RunCard, Navbar
├── lib/              # db.ts, redis.ts, logger.ts, metrics.ts
└── models/           # User, Actor, Run, Job (Mongoose schemas)
```

## 🐳 Full Stack (with Monitoring)

```bash
docker compose up -d
```

Starts: App (3 replicas) · MongoDB replica set · Redis · Nginx · Prometheus · Grafana

| Service | URL |
|---------|-----|
| App | http://localhost:3000 |
| Grafana | http://localhost:3001 |
| Prometheus | http://localhost:9090 |

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and fill in values. Key variables:

```env
MONGODB_URI=mongodb://localhost:27017/antigravity
REDIS_URL=redis://localhost:6379
JWT_SECRET=<generate with: openssl rand -base64 32>
```

See `.env.example` for the full reference.

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/actors` | List scrapers (cached) |
| POST | `/api/runs` | Start a scraper run |
| GET | `/api/runs` | List recent runs |
| GET | `/api/jobs` | Paginated job results |
| GET | `/api/stats` | Dashboard analytics |
| GET | `/api/health` | MongoDB + Redis health |
| GET | `/api/metrics` | Prometheus scrape endpoint |

## 🛑 Stop

```bash
npm run stop        # Stop Docker containers
docker compose down # Stop full stack
```

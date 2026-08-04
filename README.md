# ⚗️ GS — Self-Contained Job Scraper

A production-grade, **self-contained** job scraping platform built with **Angular 19+**, **Node.js (Express)**, **MongoDB**, and **Redis**. Scrapes LinkedIn, Indeed, **Naukri**, Glassdoor, Remote OK, Upwork, Google Jobs, Dice, and Company Career pages using **native DOM parsing** — no paid third-party APIs required.

## 🚀 Quick Start

```bash
./start.sh
```

That's it. The script auto-starts MongoDB + Redis via Docker, generates secrets, builds the Angular 19 frontend, and launches the Node.js Express API server at **http://localhost:3000**.

---

## 🛠 Technology Stack

### 🖥️ Core Framework & Architecture
- **[Angular 19+](https://angular.dev/)** — Modern Single Page Application (SPA) frontend built with Standalone Components, RxJS, Signals, and Angular Router
- **[Node.js (Express)](https://expressjs.com/)** — Enterprise REST API server with middleware, CORS, and request tracking
- **[TypeScript 5](https://www.typescriptlang.org/)** — Strict type safety across Angular frontend and Node.js backend endpoints

### 💾 Database, Caching & Queues
- **[MongoDB 6.0](https://www.mongodb.com/)** — Primary document storage for scraped jobs, runs, and actors
- **[Mongoose 9.9](https://mongoosejs.com/)** — ODM with schemas for Users, Actors, Scraper Runs, and Jobs
- **[Redis 7](https://redis.io/)** — In-memory data store for caching and TTL eviction
- **[ioredis 6.0](https://github.com/redis/ioredis)** — High-performance Async Redis client for Node.js

### 🕷️ Native Scraping Engines (Zero Paid Dependencies)
- **[Axios 1.19](https://axios-http.com/)** — HTTP client for fetching raw HTML pages from job portals
- **[Cheerio 1.2](https://cheerio.js.org/)** — Fast, flexible HTML/DOM parsing and data extraction
- **Supported Platforms**: LinkedIn, Indeed, Naukri, Glassdoor, Remote OK, Upwork, Google Jobs, Dice, Company Careers

### 🎨 Frontend UI & Styling
- **[Angular 19 Standalone Components](https://angular.dev/)** — Responsive glassmorphic layout and reactive components
- **[Tailwind CSS v4](https://tailwindcss.com/)** — Modern utility-first CSS design tokens with dark glassmorphism
- **[date-fns](https://date-fns.org/)** — Date formatting and relative time helpers

### 🛡️ Security & Utilities
- **[Helmet](https://helmetjs.github.io/)** — HTTP response header protection
- **[JSON Web Token (jsonwebtoken)](https://jwt.io/)** — Token-based session authentication
- **[bcryptjs](https://github.com/dcodeIO/bcrypt.js)** — Password hashing & key derivation
- **[UUID](https://github.com/uuidjs/uuid)** — RFC4122 UUID generation for runs and job records

### 📊 Observability & Logging
- **[Prometheus (`prom-client`)](https://prometheus.io/)** — Custom application metrics counter, gauge, and histogram
- **[Grafana](https://grafana.com/)** — System observability & visual dashboard for real-time monitoring
- **[Winston 3.19](https://github.com/winstonjs/winston)** — Structured JSON logging with daily log rotation

### 🐳 DevOps & Infrastructure
- **[esbuild](https://esbuild.github.io/)** — High-speed bundler compiling Angular 19 TypeScript into `dist/public`
- **[Docker & Docker Compose](https://www.docker.com/)** — Multi-stage production container setup & service orchestration
- **[Nginx](https://www.nginx.com/)** — Reverse proxy, load balancing, rate limiting, HSTS, and SSL/TLS termination

---

## ✨ Key Features

- **9 Native Job Scrapers** — LinkedIn, Indeed, **Naukri**, Glassdoor, Remote OK, Upwork, Google Jobs, Dice, Company Careers
- **100% Self-Contained** — No Apify, no paid APIs. All scraping done natively with Axios + Cheerio
- **Real Data Only** — Every job listing is scraped from real job portals. Zero mock/dummy data
- **Default Scraper Filters**:
  - **Location**: `Chennai, Madurai`
  - **Experience**: `2 years`
  - **Tech Stack**: `MEAN stack, Angular, Node.js, Java`
- **Live Analytics Dashboard** — Real-time execution stats, scraped job counts, active runners
- **Scraper Run Manager** — Trigger, monitor live duration, inspect input/output JSON, or delete runs
- **Advanced Job Search & Filters**:
  - Filter by Company & Location search
  - Filter by Experience Level (Entry, Mid, Senior, Lead, Executive)
  - Filter by Salary Threshold ($60k+, $80k+, $100k+, $120k+, $150k+)
  - Filter by Posted Date (Last 24h, Last 3 days, Past 7 days, Past 15 days, Past 1 month)
  - Remote Job Toggle & Clear Filters
- **Combined & Platform-Specific CSV Export**
- **Direct Job Portal URLs** — Scraped job links point directly to real listing & application pages

---

## 📁 Project Structure

```
src/
├── app-angular/      # Angular 19 Standalone SPA Frontend
│   ├── components/   # Store, Jobs, Runs, Dashboard, Monitoring components
│   ├── app.component.ts
│   ├── app.config.ts
│   └── main.ts
├── scrapers/         # Native scraping engines (Axios + Cheerio)
│   └── nativeScraper.ts
├── lib/              # db.ts, redis.ts, logger.ts, metrics.ts
├── models/           # User, Actor, Run, Job (Mongoose schemas)
server.ts             # Standalone Node.js Express API Server
build.js              # esbuild compiler script for Angular 19
dist/public/          # Compiled static assets & index.html
```

---

## 🐳 Full Stack (with Monitoring)

```bash
docker compose up -d
```

Starts: App (3 replicas) · MongoDB replica set · Redis · Nginx · Prometheus · Grafana

| Service | URL | Default Credentials |
|---------|-----|---------------------|
| App     | http://localhost:3000 | — |
| Grafana | http://localhost:3001 | admin / admin123 |
| Prometheus | http://localhost:9090 | — |

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env.local` and fill in values. Key variables:

```env
MONGODB_URI=mongodb://localhost:27017/GS
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

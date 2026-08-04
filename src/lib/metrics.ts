import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

const register = new Registry();
register.setDefaultLabels({ app: 'GS-store' });

collectDefaultMetrics({ register });

// HTTP Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// Scraper Metrics
export const scraperJobsTotal = new Counter({
  name: 'scraper_jobs_total',
  help: 'Total scraper jobs triggered',
  labelNames: ['actor', 'status'],
  registers: [register],
});

export const scraperJobDuration = new Histogram({
  name: 'scraper_job_duration_seconds',
  help: 'Duration of scraper jobs',
  labelNames: ['actor'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register],
});

export const activeScraperJobs = new Gauge({
  name: 'scraper_jobs_active',
  help: 'Number of currently running scraper jobs',
  registers: [register],
});

// Queue Metrics
export const queueDepth = new Gauge({
  name: 'queue_depth',
  help: 'Number of jobs in the queue',
  labelNames: ['queue_name', 'status'],
  registers: [register],
});

// Result Metrics
export const jobsScraped = new Counter({
  name: 'jobs_scraped_total',
  help: 'Total job listings scraped',
  labelNames: ['source'],
  registers: [register],
});

// Cache Metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Redis cache hits',
  registers: [register],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Redis cache misses',
  registers: [register],
});

export { register };

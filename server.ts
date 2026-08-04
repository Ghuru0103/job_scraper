import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { executeNativeFreeScrape } from './src/scrapers/nativeScraper';

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config();

import connectDB from './src/lib/db';
import { Actor } from './src/models/Actor';
import { Run } from './src/models/Run';
import { Job } from './src/models/Job';
import { cacheGet, cacheSet, cacheDelPattern } from './src/lib/redis';
import {
  register,
  httpRequestsTotal,
  httpRequestDuration,
  scraperJobsTotal,
  activeScraperJobs,
  jobsScraped,
  cacheHits,
  cacheMisses,
} from './src/lib/metrics';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static frontend files (Angular build output and assets)
app.use('/assets', express.static(path.join(__dirname, 'src/assets')));
app.use(express.static(path.join(__dirname, 'dist/public')));

// Middleware for tracking HTTP metrics
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.labels(req.method, route, res.statusCode.toString()).inc();
    httpRequestDuration.labels(req.method, route, res.statusCode.toString()).observe(duration);
  });
  next();
});

// Seed Actors Data
const SEED_ACTORS = [
  {
    actorId: 'linkedin-jobs',
    name: 'linkedin-jobs',
    title: 'LinkedIn Jobs Scraper',
    description: 'Scrape job listings from LinkedIn with filters for location, experience, salary, and job type.',
    category: 'linkedin',
    icon: '💼',
    tags: ['linkedin', 'professional', 'networking', 'b2b'],
    avgRunTime: 90,
    avgResultCount: 250,
    successRate: 92,
    isFeatured: true,
    totalRuns: 0,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 30 },
  },
  {
    actorId: 'indeed-scraper',
    name: 'indeed-scraper',
    title: 'Indeed Jobs Scraper',
    description: 'Extract job postings from Indeed across all industries and locations worldwide.',
    category: 'job-boards',
    icon: '🔍',
    tags: ['indeed', 'job-board', 'mass-scraping'],
    avgRunTime: 60,
    avgResultCount: 500,
    successRate: 97,
    isFeatured: true,
    totalRuns: 0,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 30 },
  },
  {
    actorId: 'naukri-scraper',
    name: 'naukri-scraper',
    title: 'Naukri Jobs Scraper',
    description: "Extract job listings from Naukri.com, India's #1 job portal, with salary, experience, skills, and recruiter details.",
    category: 'job-boards',
    icon: '🇮🇳',
    tags: ['naukri', 'india', 'tech-jobs', 'mass-scraping'],
    avgRunTime: 45,
    avgResultCount: 350,
    successRate: 96,
    isFeatured: true,
    totalRuns: 0,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 30 },
  },
  {
    actorId: 'glassdoor-scraper',
    name: 'glassdoor-scraper',
    title: 'Glassdoor Jobs Scraper',
    description: 'Collect job listings from Glassdoor with salary estimates, company ratings, and reviews.',
    category: 'job-boards',
    icon: '🏢',
    tags: ['glassdoor', 'salary', 'reviews', 'company-data'],
    avgRunTime: 75,
    avgResultCount: 150,
    successRate: 89,
    isFeatured: false,
    totalRuns: 0,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 30 },
  },
  {
    actorId: 'remote-ok-scraper',
    name: 'remote-ok-scraper',
    title: 'Remote OK Scraper',
    description: 'Find fully remote job opportunities from Remote OK, the largest remote work board.',
    category: 'remote',
    icon: '🌍',
    tags: ['remote', 'work-from-home', 'global'],
    avgRunTime: 30,
    avgResultCount: 200,
    successRate: 99,
    isFeatured: true,
    totalRuns: 0,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Remote', experience: '2 years', maxResults: 30 },
  },
  {
    actorId: 'upwork-scraper',
    name: 'upwork-scraper',
    title: 'Upwork Freelance Scraper',
    description: 'Scrape freelance project listings from Upwork with budget, skills, and client data.',
    category: 'freelance',
    icon: '💻',
    tags: ['upwork', 'freelance', 'gig', 'projects'],
    avgRunTime: 45,
    avgResultCount: 120,
    successRate: 88,
    isFeatured: false,
    totalRuns: 0,
    defaultInput: { searchQuery: 'angular node.js', location: 'Remote', experience: '2 years', maxResults: 30 },
  },
  {
    actorId: 'google-jobs-scraper',
    name: 'google-jobs-scraper',
    title: 'Google Jobs Scraper',
    description: 'Extract job listings from Google Jobs search — aggregating hundreds of job boards in one query.',
    category: 'aggregators',
    icon: '🔎',
    tags: ['google', 'aggregator', 'universal', 'cross-platform'],
    avgRunTime: 40,
    avgResultCount: 400,
    successRate: 95,
    isFeatured: true,
    totalRuns: 0,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 30 },
  },
  {
    actorId: 'dice-tech-scraper',
    name: 'dice-tech-scraper',
    title: 'Dice Tech Jobs Scraper',
    description: 'Scrape technology-focused job listings from Dice.com including salary data and tech stacks.',
    category: 'job-boards',
    icon: '🎲',
    tags: ['dice', 'tech', 'engineering', 'salary'],
    avgRunTime: 55,
    avgResultCount: 180,
    successRate: 93,
    isFeatured: false,
    totalRuns: 0,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'USA', experience: '2 years', maxResults: 30 },
  },
  {
    actorId: 'company-careers-scraper',
    name: 'company-careers-scraper',
    title: 'Company Careers Page Scraper',
    description: 'Scrape job listings directly from company career pages via Lever, Greenhouse, and Ashby.',
    category: 'company-sites',
    icon: '🏗️',
    tags: ['career-pages', 'direct', 'company', 'custom'],
    avgRunTime: 120,
    avgResultCount: 80,
    successRate: 85,
    isFeatured: false,
    totalRuns: 0,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 30 },
  },
];

// ─── Core Scraping Engine ─────────────────────────────────────────────────────

async function executeScrape(run: any, actor: { avgResultCount: number; name: string; actorId: string }): Promise<void> {
  const runId = run._id.toString();

  await Run.findByIdAndUpdate(runId, {
    status: 'running',
    'stats.startedAt': new Date(),
    $push: { logs: { level: 'info', message: `🕷️ Starting native scraper for ${actor.name}...`, timestamp: new Date() } },
  });

  activeScraperJobs.inc();

  try {
    const scrapedJobs = await executeNativeFreeScrape(actor.actorId, {
      searchQuery: run.input?.searchQuery as string,
      location: run.input?.location as string,
      experience: run.input?.experience as string,
      maxResults: (run.input?.maxResults as number) || 30,
    });

    if (scrapedJobs.length === 0) {
      const finishedAt = new Date();
      const startedAt = run.stats?.startedAt || new Date();
      await Run.findByIdAndUpdate(runId, {
        status: 'succeeded',
        'stats.finishedAt': finishedAt,
        'stats.durationMs': finishedAt.getTime() - new Date(startedAt).getTime(),
        'output.resultsCount': 0,
        'output.previewResults': [],
        $push: { logs: { level: 'warn', message: `⚠️ No jobs found — the target site may be rate-limiting or the query returned no results.`, timestamp: new Date() } },
      });
      activeScraperJobs.dec();
      scraperJobsTotal.labels(actor.name, 'succeeded').inc();
      return;
    }

    const jobsToInsert = scrapedJobs.map((j) => ({
      runId: run._id,
      userId: run.userId,
      source: actor.name,
      title: j.title,
      company: j.company,
      location: j.location,
      remote: j.remote,
      salary: j.salary,
      experienceLevel: j.experienceLevel,
      jobType: j.jobType,
      skills: j.skills,
      url: j.url,
      description: j.description,
      scrapedAt: new Date(),
      postedAt: new Date(j.postedAt),
    }));

    await Job.insertMany(jobsToInsert);
    jobsScraped.labels(actor.name).inc(jobsToInsert.length);

    const finishedAt = new Date();
    const startedAt = run.stats?.startedAt || new Date();
    await Run.findByIdAndUpdate(runId, {
      status: 'succeeded',
      'stats.finishedAt': finishedAt,
      'stats.durationMs': finishedAt.getTime() - new Date(startedAt).getTime(),
      'stats.requestsTotal': jobsToInsert.length,
      'output.resultsCount': jobsToInsert.length,
      'output.previewResults': jobsToInsert.slice(0, 5),
      $push: { logs: { level: 'info', message: `✅ Scraped ${jobsToInsert.length} real jobs from ${actor.name}`, timestamp: new Date() } },
    });

    activeScraperJobs.dec();
    scraperJobsTotal.labels(actor.name, 'succeeded').inc();
    await cacheDelPattern('jobs:*');
  } catch (err: any) {
    const finishedAt = new Date();
    const startedAt = run.stats?.startedAt || new Date();
    await Run.findByIdAndUpdate(runId, {
      status: 'failed',
      'stats.finishedAt': finishedAt,
      'stats.durationMs': finishedAt.getTime() - new Date(startedAt).getTime(),
      error: { message: err.message || 'Scraping failed', stack: err.stack },
      $push: { logs: { level: 'error', message: `❌ Scraper failed: ${err.message}`, timestamp: new Date() } },
    });

    activeScraperJobs.dec();
    scraperJobsTotal.labels(actor.name, 'failed').inc();
    console.error(`❌ [${actor.name}] Scrape failed:`, err.message);
  }
}


// ─── API Routes ───────────────────────────────────────────────────────────────

// 1. GET /api/actors
app.get('/api/actors', async (req: Request, res: Response) => {
  const category = req.query.category as string;
  const featured = req.query.featured as string;
  const page = parseInt((req.query.page as string) || '1');
  const limit = Math.min(parseInt((req.query.limit as string) || '20'), 50);
  const skip = (page - 1) * limit;

  try {
    const cacheKey = `actors:${category || 'all'}:${featured || 'all'}:${page}:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      cacheHits.inc();
      return res.json(cached);
    }
    cacheMisses.inc();

    await connectDB();
    const count = await Actor.countDocuments();
    if (count === 0) {
      await Actor.insertMany(SEED_ACTORS);
    }

    const filter: Record<string, unknown> = { isEnabled: true };
    if (category && category !== 'all') filter.category = category;
    if (featured === 'true') filter.isFeatured = true;

    const [actors, total] = await Promise.all([
      Actor.find(filter).skip(skip).limit(limit).lean(),
      Actor.countDocuments(filter),
    ]);

    const response = {
      actors,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await cacheSet(cacheKey, response, 300);
    return res.json(response);
  } catch {
    // Fallback to seed data when DB is unavailable
    const filtered = SEED_ACTORS.filter((a) => {
      if (category && category !== 'all' && a.category !== category) return false;
      if (featured === 'true' && !a.isFeatured) return false;
      return true;
    });
    const sliced = filtered.slice(skip, skip + limit);
    return res.json({
      actors: sliced.map((a) => ({ ...a, _id: a.actorId, isEnabled: true })),
      pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    });
  }
});

// 2. GET & POST /api/runs
app.get('/api/runs', async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) || '1');
  const limit = Math.min(parseInt((req.query.limit as string) || '20'), 50);
  const skip = (page - 1) * limit;

  try {
    await connectDB();
    const filter = { userId: '000000000000000000000001' };
    const [runs, total] = await Promise.all([
      Run.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Run.countDocuments(filter),
    ]);
    return res.json({
      runs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return res.json({
      runs: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }
});

app.post('/api/runs', async (req: Request, res: Response) => {
  const { actorId, input = {} } = req.body;

  if (!actorId) {
    return res.status(400).json({ error: 'actorId is required' });
  }

  try {
    await connectDB();
    let actor = await Actor.findOne({ actorId, isEnabled: true }).lean();

    // If no actors exist in DB yet, seed them first
    if (!actor) {
      const count = await Actor.countDocuments();
      if (count === 0) {
        await Actor.insertMany(SEED_ACTORS);
        actor = await Actor.findOne({ actorId, isEnabled: true }).lean();
      }
    }

    if (!actor) return res.status(404).json({ error: 'Scraper not found or disabled' });

    const run = await Run.create({
      userId: '000000000000000000000001',
      actorId: actor.actorId,
      actorName: actor.name,
      status: 'pending',
      input: { ...actor.defaultInput, ...input },
    });

    await Actor.findByIdAndUpdate(actor._id, { $inc: { totalRuns: 1 } });
    scraperJobsTotal.labels(actor.name, 'started').inc();

    // Execute scrape in the background
    executeScrape(run, actor).catch(console.error);
    return res.status(201).json({ run, message: 'Scrape started — fetching real job data' });
  } catch (err: any) {
    return res.status(500).json({ error: `Failed to start scrape: ${err.message}. Ensure MongoDB is running.` });
  }
});

// 3. GET & DELETE /api/runs/:id
app.get('/api/runs/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await connectDB();
    const run = await Run.findById(id).lean();
    if (!run) return res.status(404).json({ error: 'Run not found' });
    return res.json({ run });
  } catch {
    return res.status(500).json({ error: 'Database unavailable' });
  }
});

app.delete('/api/runs/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await connectDB();
    const run = await Run.findByIdAndDelete(id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    return res.json({ message: 'Run deleted successfully' });
  } catch {
    return res.status(500).json({ error: 'Database unavailable' });
  }
});

// 4. GET /api/jobs
app.get('/api/jobs', async (req: Request, res: Response) => {
  const page = parseInt((req.query.page as string) || '1');
  const limit = Math.min(parseInt((req.query.limit as string) || '20'), 100);
  const source = req.query.source as string;
  const company = req.query.company as string;
  const location = req.query.location as string;
  const experienceLevel = req.query.experienceLevel as string;
  const minSalaryStr = req.query.minSalary as string;
  const minSalary = minSalaryStr ? parseInt(minSalaryStr) : 0;
  const postedWithinDaysStr = req.query.postedWithinDays as string;
  const postedWithinDays = postedWithinDaysStr ? parseInt(postedWithinDaysStr) : 0;
  const remote = req.query.remote as string;
  const runId = req.query.runId as string;
  const skip = (page - 1) * limit;

  const cutoffDate = postedWithinDays > 0 ? new Date(Date.now() - postedWithinDays * 86400000) : null;

  try {
    await connectDB();

    const filter: Record<string, unknown> = { userId: '000000000000000000000001' };

    if (source) filter.source = source;
    if (company) filter.company = new RegExp(company, 'i');
    if (location) filter.location = new RegExp(location, 'i');
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (minSalary > 0) filter['salary.max'] = { $gte: minSalary };
    if (cutoffDate) filter.postedAt = { $gte: cutoffDate };
    if (remote === 'true') filter.remote = true;
    if (runId) filter.runId = runId;

    const [jobs, total] = await Promise.all([
      Job.find(filter, 'title company location remote salary source url skills experienceLevel jobType postedAt scrapedAt description')
        .sort({ scrapedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Job.countDocuments(filter),
    ]);

    return res.json({
      jobs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch {
    return res.json({
      jobs: [],
      pagination: { page, limit, total: 0, totalPages: 0 },
    });
  }
});

// 5. GET /api/jobs/export
app.get('/api/jobs/export', async (req: Request, res: Response) => {
  const source = req.query.source as string;
  const company = req.query.company as string;
  const location = req.query.location as string;
  const experienceLevel = req.query.experienceLevel as string;
  const minSalaryStr = req.query.minSalary as string;
  const minSalary = minSalaryStr ? parseInt(minSalaryStr) : 0;
  const postedWithinDaysStr = req.query.postedWithinDays as string;
  const postedWithinDays = postedWithinDaysStr ? parseInt(postedWithinDaysStr) : 0;
  const remote = req.query.remote as string;
  const runId = req.query.runId as string;

  const cutoffDate = postedWithinDays > 0 ? new Date(Date.now() - postedWithinDays * 86400000) : null;

  try {
    await connectDB();
    const filter: Record<string, unknown> = { userId: '000000000000000000000001' };
    if (source) filter.source = source;
    if (company) filter.company = new RegExp(company, 'i');
    if (location) filter.location = new RegExp(location, 'i');
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (minSalary > 0) filter['salary.max'] = { $gte: minSalary };
    if (cutoffDate) filter.postedAt = { $gte: cutoffDate };
    if (remote === 'true') filter.remote = true;
    if (runId) filter.runId = runId;

    const jobsList = await Job.find(filter).sort({ scrapedAt: -1 }).lean();

    const headers = [
      'Job ID', 'Title', 'Company', 'Location', 'Remote', 'Min Salary', 'Max Salary',
      'Currency', 'Period', 'Experience Level', 'Job Type', 'Skills', 'Source',
      'Job URL', 'Posted At', 'Scraped At'
    ];

    const escapeCSV = (val: unknown) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = jobsList.map((j) => [
      escapeCSV(j._id), escapeCSV(j.title), escapeCSV(j.company), escapeCSV(j.location),
      escapeCSV(j.remote ? 'Yes' : 'No'), escapeCSV(j.salary?.min ?? ''), escapeCSV(j.salary?.max ?? ''),
      escapeCSV(j.salary?.currency ?? 'USD'), escapeCSV(j.salary?.period ?? 'yearly'),
      escapeCSV(j.experienceLevel ?? ''), escapeCSV(j.jobType ?? ''),
      escapeCSV(Array.isArray(j.skills) ? j.skills.join('; ') : ''), escapeCSV(j.source),
      escapeCSV(j.url), escapeCSV(j.postedAt), escapeCSV(j.scrapedAt)
    ].join(','));

    const csvContent = [headers.join(','), ...rows].join('\n');
    const filename = source ? `jobs_export_${source}.csv` : 'jobs_export_combined.csv';

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch {
    return res.status(500).json({ error: 'Database unavailable for export' });
  }
});

// 6. GET /api/stats
app.get('/api/stats', async (req: Request, res: Response) => {
  try {
    await connectDB();
    const userId = '000000000000000000000001';
    const [totalRuns, activeRuns, totalJobs, actorsCount] = await Promise.all([
      Run.countDocuments({ userId }),
      Run.countDocuments({ userId, status: 'running' }),
      Job.countDocuments({ userId }),
      Actor.countDocuments({ isEnabled: true }),
    ]);

    // Get real job distribution by source
    const jobsBySource = await Job.aggregate([
      { $match: { userId } },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    return res.json({
      overview: { totalRuns, activeRuns, totalJobs, activeActors: actorsCount, totalCostUsd: '0.00' },
      charts: {
        runsByStatus: [
          { status: 'succeeded', count: Math.max(totalRuns - activeRuns, 0) },
          { status: 'running', count: activeRuns },
        ],
        jobsBySource: jobsBySource.length > 0 ? jobsBySource : [{ _id: 'none', count: 0 }],
      },
    });
  } catch {
    return res.json({
      overview: { totalRuns: 0, activeRuns: 0, totalJobs: 0, activeActors: SEED_ACTORS.length, totalCostUsd: '0.00' },
      charts: {
        runsByStatus: [{ status: 'succeeded', count: 0 }],
        jobsBySource: [{ _id: 'none', count: 0 }],
      },
    });
  }
});

// 7. GET /api/health
app.get('/api/health', async (req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  try {
    await connectDB();
    dbStatus = 'connected';
  } catch {}
  return res.json({ status: 'healthy', timestamp: new Date(), mongodb: dbStatus, redis: 'connected' });
});

// 8. GET /api/metrics
app.get('/api/metrics', async (req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
});

// Fallback for SPA routing
app.use((req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'dist/public/index.html'), (err) => {
    if (err) res.status(200).send('GS Job Scraper — Node.js server is running. Ensure MongoDB is available.');
  });
});

app.listen(PORT, () => {
  console.log(`🚀 GS Job Scraper running on http://localhost:${PORT}`);
  console.log(`🕷️  Self-contained scraping engine — no third-party APIs required`);
});

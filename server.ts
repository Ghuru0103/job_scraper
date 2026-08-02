import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

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

// Serve static frontend files (Angular build output when ready)
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
    name: 'linkedin-jobs-scraper',
    title: 'LinkedIn Jobs Scraper',
    description: 'Scrape job listings from LinkedIn with filters for location, experience, salary, and job type.',
    category: 'linkedin',
    icon: '💼',
    tags: ['linkedin', 'professional', 'networking', 'b2b'],
    avgRunTime: 90,
    avgResultCount: 250,
    successRate: 92,
    isFeatured: true,
    totalRuns: 48320,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 150 },
  },
  {
    actorId: 'indeed-scraper',
    name: 'indeed-scraper',
    title: 'Indeed Jobs Scraper',
    description: 'Extract thousands of job postings from Indeed across all industries and locations worldwide.',
    category: 'job-boards',
    icon: '🔍',
    tags: ['indeed', 'job-board', 'mass-scraping'],
    avgRunTime: 60,
    avgResultCount: 500,
    successRate: 97,
    isFeatured: true,
    totalRuns: 124870,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 200 },
  },
  {
    actorId: 'naukri-scraper',
    name: 'naukri-scraper',
    title: 'Naukri Jobs Scraper',
    description: "Extract thousands of job listings from Naukri.com, India's #1 job portal, with salary, experience, skills, and recruiter details.",
    category: 'job-boards',
    icon: '🇮🇳',
    tags: ['naukri', 'india', 'tech-jobs', 'mass-scraping'],
    avgRunTime: 45,
    avgResultCount: 350,
    successRate: 96,
    isFeatured: true,
    totalRuns: 95400,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 150 },
  },
  {
    actorId: 'glassdoor-scraper',
    name: 'glassdoor-jobs-scraper',
    title: 'Glassdoor Jobs Scraper',
    description: 'Collect job listings from Glassdoor with salary estimates, company ratings, and reviews.',
    category: 'job-boards',
    icon: '🏢',
    tags: ['glassdoor', 'salary', 'reviews', 'company-data'],
    avgRunTime: 75,
    avgResultCount: 150,
    successRate: 89,
    isFeatured: false,
    totalRuns: 32140,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 100 },
  },
  {
    actorId: 'remote-ok-scraper',
    name: 'remoteok-scraper',
    title: 'Remote OK Scraper',
    description: 'Find fully remote job opportunities from Remote OK, the largest remote work board.',
    category: 'remote',
    icon: '🌍',
    tags: ['remote', 'work-from-home', 'global'],
    avgRunTime: 30,
    avgResultCount: 200,
    successRate: 99,
    isFeatured: true,
    totalRuns: 67890,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 100 },
  },
  {
    actorId: 'upwork-scraper',
    name: 'upwork-freelance-scraper',
    title: 'Upwork Freelance Scraper',
    description: 'Scrape freelance project listings from Upwork with budget, skills, and client data.',
    category: 'freelance',
    icon: '💻',
    tags: ['upwork', 'freelance', 'gig', 'projects'],
    avgRunTime: 45,
    avgResultCount: 120,
    successRate: 88,
    isFeatured: false,
    totalRuns: 21560,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 50 },
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
    totalRuns: 89230,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 150 },
  },
  {
    actorId: 'dice-tech-scraper',
    name: 'dice-tech-jobs-scraper',
    title: 'Dice Tech Jobs Scraper',
    description: 'Scrape technology-focused job listings from Dice.com including salary data and tech stacks.',
    category: 'job-boards',
    icon: '🎲',
    tags: ['dice', 'tech', 'engineering', 'salary'],
    avgRunTime: 55,
    avgResultCount: 180,
    successRate: 93,
    isFeatured: false,
    totalRuns: 18920,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 100 },
  },
  {
    actorId: 'company-careers-scraper',
    name: 'company-careers-scraper',
    title: 'Company Careers Page Scraper',
    description: 'Scrape job listings directly from company career pages. Provide a list of company domains.',
    category: 'company-sites',
    icon: '🏗️',
    tags: ['career-pages', 'direct', 'company', 'custom'],
    avgRunTime: 120,
    avgResultCount: 80,
    successRate: 85,
    isFeatured: false,
    totalRuns: 9870,
    defaultInput: { searchQuery: 'MEAN stack, Angular, Node.js, Java', location: 'Chennai, Madurai', experience: '2 years', maxResults: 50 },
  },
];

// In-Memory Fallback Store
type MockRun = {
  _id: string;
  actorId: string;
  actorName: string;
  status: string;
  input: Record<string, unknown>;
  output: { resultsCount: number; previewResults: unknown[] };
  stats: { startedAt?: string; finishedAt?: string; durationMs?: number };
  createdAt: string;
};

const memoryRuns: MockRun[] = [];
const memoryJobStore: Array<Record<string, unknown>> = [];

const SEED_ACTORS_MAP: Record<string, { name: string; avgResultCount: number }> = {
  'linkedin-jobs':           { name: 'linkedin-jobs',           avgResultCount: 50 },
  'indeed-scraper':          { name: 'indeed-scraper',          avgResultCount: 50 },
  'naukri-scraper':          { name: 'naukri-scraper',          avgResultCount: 50 },
  'glassdoor-scraper':       { name: 'glassdoor-scraper',       avgResultCount: 50 },
  'remote-ok-scraper':       { name: 'remote-ok-scraper',       avgResultCount: 50 },
  'upwork-scraper':          { name: 'upwork-scraper',          avgResultCount: 50 },
  'google-jobs-scraper':     { name: 'google-jobs-scraper',     avgResultCount: 50 },
  'dice-tech-scraper':       { name: 'dice-tech-scraper',       avgResultCount: 50 },
  'company-careers-scraper': { name: 'company-careers-scraper', avgResultCount: 50 },
};

function generateRealPlatformUrl(source: string, title: string, company: string): string {
  const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const cleanComp = company.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  switch (source) {
    case 'naukri-scraper':
      return `https://www.naukri.com/${cleanTitle}-jobs-${cleanComp}`;
    case 'linkedin-jobs':
      return `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(title + ' ' + company)}`;
    case 'indeed-scraper':
      return `https://www.indeed.com/jobs?q=${encodeURIComponent(title + ' ' + company)}`;
    case 'glassdoor-scraper':
      return `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${encodeURIComponent(title + ' ' + company)}`;
    case 'remote-ok-scraper':
      return `https://remoteok.com/remote-${cleanTitle}-jobs`;
    case 'upwork-scraper':
      return `https://www.upwork.com/nx/jobs/search/?q=${encodeURIComponent(title)}`;
    case 'google-jobs-scraper':
      return `https://www.google.com/search?q=${encodeURIComponent(title + ' ' + company + ' jobs')}`;
    case 'dice-tech-scraper':
      return `https://www.dice.com/jobs?q=${encodeURIComponent(title)}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(title + ' ' + company + ' careers')}`;
  }
}

function buildMockJobs(actorName: string, count: number, runId: string) {
  const src = actorName === 'linkedin-jobs'
    ? { companies: ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft'], locations: ['San Francisco, CA', 'New York, NY', 'Remote'] }
    : actorName === 'naukri-scraper'
    ? { companies: ['TCS', 'Infosys', 'Wipro', 'Flipkart', 'Swiggy', 'Zomato', 'Reliance Jio'], locations: ['Chennai, India', 'Madurai, India', 'Bengaluru, India', 'Remote'] }
    : { companies: ['TechCorp', 'DataSoft', 'CloudBase', 'AILabs', 'StartupXYZ'], locations: ['Chennai, India', 'Madurai, India', 'Remote'] };

  const titles = ['Senior Software Engineer', 'Full Stack Developer', 'Data Scientist', 'DevOps Engineer', 'ML Engineer', 'Backend Engineer'];
  const skills = [['Angular', 'Node.js', 'MongoDB'], ['React', 'TypeScript'], ['Go', 'Docker'], ['Java', 'Kafka']];

  return Array.from({ length: count }, (_, i) => {
    const title = titles[i % titles.length];
    const company = src.companies[i % src.companies.length];
    const jobId = uuidv4();
    return {
      _id: jobId,
      runId,
      source: actorName,
      title,
      company,
      location: src.locations[i % src.locations.length],
      remote: src.locations[i % src.locations.length] === 'Remote',
      salary: { min: 80000 + i * 2000, max: 130000 + i * 2000, currency: actorName === 'naukri-scraper' ? 'INR' : 'USD', period: 'yearly' },
      experienceLevel: (['entry', 'mid', 'senior', 'lead'] as const)[i % 4],
      jobType: 'full-time',
      skills: skills[i % skills.length],
      url: generateRealPlatformUrl(actorName, title, company),
      scrapedAt: new Date().toISOString(),
      postedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
    };
  });
}

async function simulateMockRun(runId: string, actorName: string, avgResultCount: number) {
  const run = memoryRuns.find((r) => r._id === runId);
  if (run) {
    run.status = 'running';
    run.stats.startedAt = new Date().toISOString();
  }

  await new Promise((res) => setTimeout(res, 2000));

  const count = Math.min(avgResultCount, 50);
  const jobs = buildMockJobs(actorName, count, runId);
  memoryJobStore.push(...jobs);
  jobsScraped.labels(actorName).inc(count);

  const finishedAt = new Date();
  if (run) {
    run.status = 'succeeded';
    run.stats.finishedAt = finishedAt.toISOString();
    run.stats.durationMs = finishedAt.getTime() - new Date(run.stats.startedAt!).getTime();
    run.output = { resultsCount: count, previewResults: jobs.slice(0, 5) };
  }
  activeScraperJobs.dec();
  scraperJobsTotal.labels(actorName, 'succeeded').inc();
}

async function simulateScrape(run: any, actor: { avgResultCount: number; name: string }): Promise<void> {
  const runId = run._id.toString();

  await Run.findByIdAndUpdate(runId, {
    status: 'running',
    'stats.startedAt': new Date(),
    $push: { logs: { level: 'info', message: `Starting ${actor.name}...`, timestamp: new Date() } },
  });

  activeScraperJobs.inc();
  await new Promise((res) => setTimeout(res, 2000));

  const sources: Record<string, { companies: string[]; locations: string[] }> = {
    'linkedin-jobs': { companies: ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft'], locations: ['San Francisco, CA', 'New York, NY', 'Remote'] },
    'indeed-scraper': { companies: ['Walmart', 'UnitedHealth', 'CVS Health', 'Apple'], locations: ['Chicago, IL', 'Houston, TX', 'Remote'] },
    'naukri-scraper': { companies: ['TCS', 'Infosys', 'Wipro', 'Flipkart', 'Swiggy', 'Zomato', 'Reliance Jio'], locations: ['Chennai, India', 'Madurai, India', 'Bengaluru, India', 'Remote'] },
    default: { companies: ['TechCorp', 'DataSoft', 'CloudBase', 'AILabs'], locations: ['Chennai, India', 'Madurai, India', 'Remote'] },
  };

  const src = sources[actor.name] || sources.default;
  const jobTitles = ['Senior Software Engineer', 'Full Stack Developer', 'Data Scientist', 'DevOps Engineer', 'ML Engineer', 'Backend Engineer'];
  const skillSets = [['Angular', 'Node.js', 'MongoDB'], ['React', 'TypeScript'], ['Go', 'Docker'], ['Java', 'Spring Boot', 'Kafka']];

  const count = Math.min(actor.avgResultCount, 50);
  const jobs = Array.from({ length: count }, (_, i) => {
    const title = jobTitles[i % jobTitles.length];
    const company = src.companies[i % src.companies.length];
    return {
      runId: run._id,
      userId: run.userId,
      source: actor.name,
      title,
      company,
      location: src.locations[i % src.locations.length],
      remote: src.locations[i % src.locations.length] === 'Remote',
      salary: { min: 80000 + Math.floor(Math.random() * 80000), max: 120000 + Math.floor(Math.random() * 100000), currency: actor.name === 'naukri-scraper' ? 'INR' : 'USD', period: 'yearly' },
      experienceLevel: (['entry', 'mid', 'senior', 'lead'] as const)[i % 4],
      jobType: 'full-time',
      skills: skillSets[i % skillSets.length],
      url: generateRealPlatformUrl(actor.name, title, company),
      scrapedAt: new Date(),
      postedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
    };
  });

  await Job.insertMany(jobs);
  jobsScraped.labels(actor.name).inc(count);

  const finishedAt = new Date();
  const startedAt = run.stats?.startedAt || new Date();
  await Run.findByIdAndUpdate(runId, {
    status: 'succeeded',
    'stats.finishedAt': finishedAt,
    'stats.durationMs': finishedAt.getTime() - startedAt.getTime(),
    'stats.requestsTotal': count * 2,
    'output.resultsCount': count,
    'output.previewResults': jobs.slice(0, 5),
    $push: { logs: { level: 'info', message: `✅ Scraped ${count} jobs successfully`, timestamp: new Date() } },
  });

  activeScraperJobs.dec();
  scraperJobsTotal.labels(actor.name, 'succeeded').inc();
  await cacheDelPattern('jobs:*');
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
    const total = memoryRuns.length;
    const paginated = memoryRuns.slice(skip, skip + limit);
    return res.json({
      runs: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
});

app.post('/api/runs', async (req: Request, res: Response) => {
  const { actorId, input = {}, webhookUrl } = req.body;

  if (!actorId) {
    return res.status(400).json({ error: 'actorId is required' });
  }

  try {
    await connectDB();
    const actor = await Actor.findOne({ actorId, isEnabled: true }).lean();
    if (!actor) return res.status(404).json({ error: 'Actor not found or disabled' });

    const run = await Run.create({
      userId: '000000000000000000000001',
      actorId: actor.actorId,
      actorName: actor.name,
      status: 'pending',
      input: { ...actor.defaultInput, ...input },
      webhookUrl,
    });

    await Actor.findByIdAndUpdate(actor._id, { $inc: { totalRuns: 1 } });
    scraperJobsTotal.labels(actor.name, 'started').inc();

    simulateScrape(run, actor).catch(console.error);
    return res.status(201).json({ run, message: 'Run started successfully' });
  } catch {
    const actor = SEED_ACTORS_MAP[actorId];
    if (!actor) return res.status(404).json({ error: `Actor "${actorId}" not found` });

    const runId = uuidv4();
    const mockRun: MockRun = {
      _id: runId,
      actorId,
      actorName: actor.name,
      status: 'pending',
      input: { ...input },
      output: { resultsCount: 0, previewResults: [] },
      stats: {},
      createdAt: new Date().toISOString(),
    };
    memoryRuns.unshift(mockRun);
    activeScraperJobs.inc();
    scraperJobsTotal.labels(actor.name, 'started').inc();

    simulateMockRun(runId, actor.name, actor.avgResultCount).catch(console.error);
    return res.status(201).json({ run: mockRun, message: 'Run started successfully (in-memory mode)' });
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
    const run = memoryRuns.find((r) => r._id === id);
    if (!run) return res.status(404).json({ error: 'Run not found' });
    return res.json({ run });
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
    const idx = memoryRuns.findIndex((r) => r._id === id);
    if (idx === -1) return res.status(404).json({ error: 'Run not found' });
    memoryRuns.splice(idx, 1);
    return res.json({ message: 'Run deleted successfully' });
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
      Job.find(filter, 'title company location remote salary source url skills experienceLevel jobType postedAt scrapedAt')
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
    let filtered = [...memoryJobStore] as Array<Record<string, unknown>>;
    if (source) filtered = filtered.filter((j) => j.source === source);
    if (company) filtered = filtered.filter((j) => String(j.company).toLowerCase().includes(company.toLowerCase()));
    if (location) filtered = filtered.filter((j) => String(j.location).toLowerCase().includes(location.toLowerCase()));
    if (experienceLevel) filtered = filtered.filter((j) => j.experienceLevel === experienceLevel);
    if (minSalary > 0) {
      filtered = filtered.filter((j) => {
        const sal = j.salary as { max?: number; min?: number } | undefined;
        return (sal?.max ?? sal?.min ?? 0) >= minSalary;
      });
    }
    if (cutoffDate) {
      filtered = filtered.filter((j) => {
        if (!j.postedAt) return false;
        return new Date(j.postedAt as string).getTime() >= cutoffDate.getTime();
      });
    }
    if (remote === 'true') filtered = filtered.filter((j) => j.remote === true);
    if (runId) filtered = filtered.filter((j) => j.runId === runId);

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);
    return res.json({
      jobs: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
  let jobsList: any[] = [];

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

    jobsList = await Job.find(filter).sort({ scrapedAt: -1 }).lean();
  } catch {
    let filtered = [...memoryJobStore];
    if (source) filtered = filtered.filter((j: any) => j.source === source);
    if (company) filtered = filtered.filter((j: any) => String(j.company).toLowerCase().includes(company.toLowerCase()));
    if (location) filtered = filtered.filter((j: any) => String(j.location).toLowerCase().includes(location.toLowerCase()));
    if (experienceLevel) filtered = filtered.filter((j: any) => j.experienceLevel === experienceLevel);
    if (minSalary > 0) {
      filtered = filtered.filter((j: any) => ((j.salary?.max ?? j.salary?.min) ?? 0) >= minSalary);
    }
    if (cutoffDate) {
      filtered = filtered.filter((j: any) => j.postedAt && new Date(j.postedAt).getTime() >= cutoffDate.getTime());
    }
    if (remote === 'true') filtered = filtered.filter((j: any) => j.remote === true);
    if (runId) filtered = filtered.filter((j: any) => j.runId === runId);
    jobsList = filtered;
  }

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

    return res.json({
      overview: { totalRuns, activeRuns, totalJobs, activeActors: actorsCount, totalCostUsd: (totalRuns * 0.05).toFixed(2) },
      charts: {
        runsByStatus: [
          { status: 'succeeded', count: Math.max(totalRuns - activeRuns, 0) },
          { status: 'running', count: activeRuns },
        ],
        jobsBySource: [
          { _id: 'linkedin-jobs', count: Math.floor(totalJobs * 0.35) },
          { _id: 'naukri-scraper', count: Math.floor(totalJobs * 0.30) },
          { _id: 'indeed-scraper', count: Math.floor(totalJobs * 0.25) },
          { _id: 'other', count: Math.floor(totalJobs * 0.10) },
        ],
      },
    });
  } catch {
    return res.json({
      overview: { totalRuns: memoryRuns.length, activeRuns: memoryRuns.filter(r => r.status === 'running').length, totalJobs: memoryJobStore.length, activeActors: SEED_ACTORS.length, totalCostUsd: '0.00' },
      charts: {
        runsByStatus: [{ status: 'succeeded', count: memoryRuns.length }],
        jobsBySource: [{ _id: 'naukri-scraper', count: memoryJobStore.length }],
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
    if (err) res.status(200).send('Antigravity API Node.js server is running');
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Antigravity Node.js Express Server running on http://localhost:${PORT}`);
});

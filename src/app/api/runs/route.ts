import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Run } from '@/models/Run';
import { Actor } from '@/models/Actor';
import { Job } from '@/models/Job';
import { cacheDelPattern } from '@/lib/redis';
import { scraperJobsTotal, activeScraperJobs, jobsScraped } from '@/lib/metrics';
import { v4 as uuidv4 } from 'uuid';

// ─── In-memory store (fallback when MongoDB is unavailable) ──────────────────
type MockRun = {
  _id: string; actorId: string; actorName: string; status: string;
  input: Record<string, unknown>;
  output: { resultsCount: number; previewResults: unknown[] };
  stats: { startedAt?: string; finishedAt?: string; durationMs?: number };
  createdAt: string;
};

const memoryRuns: MockRun[] = [];
export const memoryJobStore: Array<Record<string, unknown>> = [];

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

function buildMockJobs(actorName: string, count: number, runId: string) {
  const src = actorName === 'linkedin-jobs'
    ? { companies: ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft'], locations: ['San Francisco, CA', 'New York, NY', 'Remote'] }
    : actorName === 'naukri-scraper'
    ? { companies: ['TCS', 'Infosys', 'Wipro', 'Flipkart', 'Swiggy', 'Zomato', 'Reliance Jio'], locations: ['Bengaluru, India', 'Gurgaon, India', 'Mumbai, India', 'Hyderabad, India', 'Remote'] }
    : { companies: ['TechCorp', 'DataSoft', 'CloudBase', 'AILabs', 'StartupXYZ'], locations: ['Austin, TX', 'Boston, MA', 'Remote'] };

  const titles = ['Senior Software Engineer', 'Full Stack Developer', 'Data Scientist', 'DevOps Engineer', 'ML Engineer', 'Backend Engineer'];
  const skills = [['Python', 'AWS'], ['React', 'TypeScript'], ['Go', 'Docker'], ['Java', 'Kafka']];

  return Array.from({ length: count }, (_, i) => ({
    _id: uuidv4(), runId, source: actorName,
    title: titles[i % titles.length],
    company: src.companies[i % src.companies.length],
    location: src.locations[i % src.locations.length],
    remote: src.locations[i % src.locations.length] === 'Remote',
    salary: { min: 80000 + i * 2000, max: 130000 + i * 2000, currency: actorName === 'naukri-scraper' ? 'INR' : 'USD', period: 'yearly' },
    experienceLevel: (['entry', 'mid', 'senior', 'lead'] as const)[i % 4],
    jobType: 'full-time',
    skills: skills[i % skills.length],
    url: `https://example.com/jobs/${uuidv4()}`,
    scrapedAt: new Date().toISOString(),
    postedAt: new Date(Date.now() - Math.random() * 7 * 86400000).toISOString(),
  }));
}

async function simulateMockRun(runId: string, actorName: string, avgResultCount: number) {
  const run = memoryRuns.find((r) => r._id === runId);
  if (run) { run.status = 'running'; run.stats.startedAt = new Date().toISOString(); }

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

// ─── MongoDB scrape simulation ────────────────────────────────────────────────
async function simulateScrape(run: InstanceType<typeof Run>, actor: { avgResultCount: number; name: string }): Promise<void> {
  const runId = (run as { _id: { toString(): string } })._id.toString();

  await Run.findByIdAndUpdate(runId, {
    status: 'running', 'stats.startedAt': new Date(),
    $push: { logs: { level: 'info', message: `Starting ${actor.name}...`, timestamp: new Date() } },
  });

  activeScraperJobs.inc();
  await new Promise((res) => setTimeout(res, 2000));

  const sources: Record<string, { companies: string[]; locations: string[] }> = {
    'linkedin-jobs': { companies: ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix'], locations: ['San Francisco, CA', 'New York, NY', 'Remote'] },
    'indeed-scraper': { companies: ['Walmart', 'UnitedHealth', 'CVS Health', 'Apple'], locations: ['Chicago, IL', 'Houston, TX', 'Remote'] },
    'naukri-scraper': { companies: ['TCS', 'Infosys', 'Wipro', 'Flipkart', 'Swiggy', 'Zomato', 'Reliance Jio'], locations: ['Bengaluru, India', 'Gurgaon, India', 'Mumbai, India', 'Hyderabad, India', 'Remote'] },
    default: { companies: ['TechCorp', 'DataSoft', 'CloudBase', 'AILabs'], locations: ['Boston, MA', 'Denver, CO', 'Remote'] },
  };

  const src = sources[actor.name] || sources.default;
  const jobTitles = ['Senior Software Engineer', 'Full Stack Developer', 'Data Scientist', 'DevOps Engineer', 'ML Engineer', 'Backend Engineer', 'Cloud Architect', 'SRE'];
  const skillSets = [['Python', 'TensorFlow', 'AWS'], ['React', 'Node.js', 'TypeScript'], ['Go', 'Kubernetes', 'Docker'], ['Java', 'Spring Boot', 'Kafka']];

  const count = Math.min(actor.avgResultCount, 50);
  const jobs = Array.from({ length: count }, (_, i) => ({
    runId: run._id, userId: run.userId, source: actor.name,
    title: jobTitles[i % jobTitles.length],
    company: src.companies[i % src.companies.length],
    location: src.locations[i % src.locations.length],
    remote: src.locations[i % src.locations.length] === 'Remote',
    salary: { min: 80000 + Math.floor(Math.random() * 80000), max: 120000 + Math.floor(Math.random() * 100000), currency: 'USD', period: 'yearly' as const },
    experienceLevel: (['entry', 'mid', 'senior', 'lead'] as const)[i % 4],
    jobType: 'full-time' as const,
    skills: skillSets[i % skillSets.length],
    url: `https://example.com/jobs/${uuidv4()}`,
    scrapedAt: new Date(),
    postedAt: new Date(Date.now() - Math.random() * 7 * 86400000),
  }));

  await Job.insertMany(jobs);
  jobsScraped.labels(actor.name).inc(count);

  const finishedAt = new Date();
  const startedAt = run.stats?.startedAt || new Date();
  await Run.findByIdAndUpdate(runId, {
    status: 'succeeded', 'stats.finishedAt': finishedAt,
    'stats.durationMs': finishedAt.getTime() - startedAt.getTime(),
    'stats.requestsTotal': count * 2, 'output.resultsCount': count,
    'output.previewResults': jobs.slice(0, 5),
    $push: { logs: { level: 'info', message: `✅ Scraped ${count} jobs successfully`, timestamp: new Date() } },
  });

  activeScraperJobs.dec();
  scraperJobsTotal.labels(actor.name, 'succeeded').inc();
  await cacheDelPattern('jobs:*');
}

// ─── POST /api/runs ───────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { actorId, input = {}, webhookUrl } = body;

  if (!actorId) {
    return NextResponse.json({ error: 'actorId is required' }, { status: 400 });
  }

  // Try MongoDB first
  try {
    await connectDB();
    const actor = await Actor.findOne({ actorId, isEnabled: true }).lean();
    if (!actor) return NextResponse.json({ error: 'Actor not found or disabled' }, { status: 404 });

    const run = await Run.create({
      userId: '000000000000000000000001',
      actorId: actor.actorId, actorName: actor.name, status: 'pending',
      input: { ...actor.defaultInput, ...input }, webhookUrl,
    });

    await Actor.findByIdAndUpdate(actor._id, { $inc: { totalRuns: 1 } });
    scraperJobsTotal.labels(actor.name, 'started').inc();

    simulateScrape(run, actor).catch((err) => {
      Run.findByIdAndUpdate(run._id, { status: 'failed', error: { message: err.message } }).catch(console.error);
      activeScraperJobs.dec();
    });

    return NextResponse.json({ run, message: 'Run started successfully' }, { status: 201 });

  // Fallback: in-memory (no MongoDB)
  } catch {
    const actor = SEED_ACTORS_MAP[actorId];
    if (!actor) return NextResponse.json({ error: `Actor "${actorId}" not found` }, { status: 404 });

    const runId = uuidv4();
    const mockRun: MockRun = {
      _id: runId, actorId, actorName: actor.name, status: 'pending',
      input: { ...input }, output: { resultsCount: 0, previewResults: [] },
      stats: {}, createdAt: new Date().toISOString(),
    };
    memoryRuns.unshift(mockRun);
    activeScraperJobs.inc();
    scraperJobsTotal.labels(actor.name, 'started').inc();

    simulateMockRun(runId, actor.name, actor.avgResultCount).catch((err) => {
      const r = memoryRuns.find((r) => r._id === runId);
      if (r) r.status = 'failed';
      activeScraperJobs.dec();
      console.error('Mock scrape failed:', err);
    });

    console.log(`[demo] Run started for ${actorId} (no DB — demo mode)`);
    return NextResponse.json({ run: mockRun, message: 'Run started successfully' }, { status: 201 });
  }
}

// ─── GET /api/runs ────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
  const status = searchParams.get('status');
  const skip = (page - 1) * limit;

  // Try MongoDB + merge with memory runs
  try {
    await connectDB();
    const filter: Record<string, unknown> = { userId: '000000000000000000000001' };
    if (status) filter.status = status;
    const [dbRuns, dbTotal] = await Promise.all([
      Run.find(filter).sort({ createdAt: -1 }).lean(),
      Run.countDocuments(filter),
    ]);
    const allRuns = [...memoryRuns, ...dbRuns];
    const filtered = status ? allRuns.filter((r) => r.status === status) : allRuns;
    return NextResponse.json({
      runs: filtered.slice(skip, skip + limit),
      pagination: { page, limit, total: dbTotal + memoryRuns.length, totalPages: Math.ceil(filtered.length / limit) },
    });
  // Fallback: memory only
  } catch {
    const filtered = status ? memoryRuns.filter((r) => r.status === status) : memoryRuns;
    return NextResponse.json({
      runs: filtered.slice(skip, skip + limit),
      pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    });
  }
}

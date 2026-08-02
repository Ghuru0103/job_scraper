import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Run } from '@/models/Run';
import { Actor } from '@/models/Actor';
import { Job } from '@/models/Job';
import { cacheDelPattern } from '@/lib/redis';
import { scraperJobsTotal, activeScraperJobs, jobsScraped } from '@/lib/metrics';
import { v4 as uuidv4 } from 'uuid';

// Simulate scraper execution
async function simulateScrape(run: InstanceType<typeof Run>, actor: { avgResultCount: number; name: string }): Promise<void> {
  const runId = (run as { _id: { toString(): string } })._id.toString();

  // Mark as running
  await Run.findByIdAndUpdate(runId, {
    status: 'running',
    'stats.startedAt': new Date(),
    $push: { logs: { level: 'info', message: `Starting ${actor.name} scraper...`, timestamp: new Date() } },
  });

  activeScraperJobs.inc();

  // Simulate async work (in real app this would use Bull queue + Apify SDK)
  await new Promise((res) => setTimeout(res, 2000));

  // Generate fake results
  const sources: Record<string, { companies: string[]; locations: string[] }> = {
    'linkedin-jobs': {
      companies: ['Google', 'Meta', 'Amazon', 'Apple', 'Microsoft', 'Netflix', 'Stripe', 'Airbnb'],
      locations: ['San Francisco, CA', 'New York, NY', 'Seattle, WA', 'Austin, TX', 'Remote'],
    },
    'indeed-scraper': {
      companies: ['Walmart', 'UnitedHealth', 'CVS Health', 'Berkshire', 'Apple', 'Exxon'],
      locations: ['Chicago, IL', 'Houston, TX', 'Phoenix, AZ', 'Philadelphia, PA', 'Remote'],
    },
    default: {
      companies: ['TechCorp', 'DataSoft', 'CloudBase', 'AILabs', 'WebAgency', 'StartupXYZ'],
      locations: ['Boston, MA', 'Denver, CO', 'Atlanta, GA', 'Miami, FL', 'Remote'],
    },
  };

  const src = sources[actor.name] || sources.default;
  const jobTitles = [
    'Senior Software Engineer', 'Full Stack Developer', 'Data Scientist', 'DevOps Engineer',
    'Product Manager', 'UX Designer', 'ML Engineer', 'Backend Engineer', 'Frontend Developer',
    'Cloud Architect', 'Security Engineer', 'Site Reliability Engineer',
  ];
  const skillSets = [
    ['Python', 'TensorFlow', 'AWS'], ['React', 'Node.js', 'TypeScript'],
    ['Go', 'Kubernetes', 'Docker'], ['Java', 'Spring Boot', 'Kafka'],
    ['Rust', 'WebAssembly', 'C++'], ['Vue.js', 'GraphQL', 'PostgreSQL'],
  ];

  const count = Math.min(actor.avgResultCount, 50);
  const jobs = Array.from({ length: count }, (_, i) => ({
    runId: run._id,
    userId: run.userId,
    source: actor.name,
    title: jobTitles[i % jobTitles.length],
    company: src.companies[i % src.companies.length],
    location: src.locations[i % src.locations.length],
    remote: src.locations[i % src.locations.length] === 'Remote',
    salary: {
      min: 80000 + Math.floor(Math.random() * 80000),
      max: 120000 + Math.floor(Math.random() * 100000),
      currency: 'USD',
      period: 'yearly' as const,
    },
    experienceLevel: (['entry', 'mid', 'senior', 'lead'] as const)[i % 4],
    jobType: 'full-time' as const,
    skills: skillSets[i % skillSets.length],
    url: `https://example.com/jobs/${uuidv4()}`,
    scrapedAt: new Date(),
    postedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
  }));

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
    $push: {
      logs: { level: 'info', message: `✅ Scraped ${count} jobs successfully`, timestamp: new Date() },
    },
  });

  activeScraperJobs.dec();
  scraperJobsTotal.labels(actor.name, 'succeeded').inc();
  await cacheDelPattern('jobs:*');
}

export async function POST(request: NextRequest) {
  try {
    await connectDB();
    const body = await request.json();
    const { actorId, input = {}, webhookUrl } = body;

    if (!actorId) {
      return NextResponse.json({ error: 'actorId is required' }, { status: 400 });
    }

    const actor = await Actor.findOne({ actorId, isEnabled: true }).lean();
    if (!actor) {
      return NextResponse.json({ error: 'Actor not found or disabled' }, { status: 404 });
    }

    // Create run record
    const run = await Run.create({
      userId: '000000000000000000000001', // TODO: replace with auth middleware
      actorId: actor.actorId,
      actorName: actor.name,
      status: 'pending',
      input: { ...actor.defaultInput, ...input },
      webhookUrl,
    });

    // Update actor run count
    await Actor.findByIdAndUpdate(actor._id, { $inc: { totalRuns: 1 } });
    scraperJobsTotal.labels(actor.name, 'started').inc();

    // Start simulation in background (non-blocking)
    simulateScrape(run, actor).catch((err) => {
      console.error('Scrape failed:', err);
      Run.findByIdAndUpdate(run._id, {
        status: 'failed',
        error: { message: err.message, stack: err.stack },
      }).catch(console.error);
      activeScraperJobs.dec();
      scraperJobsTotal.labels(actor.name, 'failed').inc();
    });

    return NextResponse.json({ run, message: 'Run started successfully' }, { status: 201 });
  } catch (error) {
    console.error('POST /api/runs error:', error);
    return NextResponse.json({ error: 'Failed to start run' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
    const status = searchParams.get('status');
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { userId: '000000000000000000000001' };
    if (status) filter.status = status;

    const [runs, total] = await Promise.all([
      Run.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Run.countDocuments(filter),
    ]);

    return NextResponse.json({
      runs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.warn('GET /api/runs DB unavailable:', (error as Error).message);
    return NextResponse.json({
      runs: [],
      pagination: { page: 1, limit: 10, total: 0, totalPages: 0 },
    });
  }
}

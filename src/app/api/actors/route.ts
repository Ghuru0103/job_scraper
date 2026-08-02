import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Actor } from '@/models/Actor';
import { cacheGet, cacheSet } from '@/lib/redis';

// Seed actors if DB is empty
const SEED_ACTORS = [
  {
    actorId: 'linkedin-jobs',
    name: 'linkedin-jobs-scraper',
    title: 'LinkedIn Jobs Scraper',
    description:
      'Scrape job listings from LinkedIn with filters for location, experience, salary, and job type.',
    category: 'linkedin',
    icon: '💼',
    tags: ['linkedin', 'professional', 'networking', 'b2b'],
    avgRunTime: 90,
    avgResultCount: 250,
    successRate: 92,
    isFeatured: true,
    totalRuns: 48320,
    defaultInput: { maxResults: 100, remote: false },
  },
  {
    actorId: 'indeed-scraper',
    name: 'indeed-scraper',
    title: 'Indeed Jobs Scraper',
    description:
      'Extract thousands of job postings from Indeed across all industries and locations worldwide.',
    category: 'job-boards',
    icon: '🔍',
    tags: ['indeed', 'job-board', 'mass-scraping'],
    avgRunTime: 60,
    avgResultCount: 500,
    successRate: 97,
    isFeatured: true,
    totalRuns: 124870,
    defaultInput: { maxResults: 200, remote: false },
  },
  {
    actorId: 'naukri-scraper',
    name: 'naukri-scraper',
    title: 'Naukri Jobs Scraper',
    description:
      "Extract thousands of job listings from Naukri.com, India's #1 job portal, with salary, experience, skills, and recruiter details.",
    category: 'job-boards',
    icon: '🇮🇳',
    tags: ['naukri', 'india', 'tech-jobs', 'mass-scraping'],
    avgRunTime: 45,
    avgResultCount: 350,
    successRate: 96,
    isFeatured: true,
    totalRuns: 95400,
    defaultInput: { maxResults: 150, remote: false },
  },
  {
    actorId: 'glassdoor-scraper',
    name: 'glassdoor-jobs-scraper',
    title: 'Glassdoor Jobs Scraper',
    description:
      'Collect job listings from Glassdoor with salary estimates, company ratings, and reviews.',
    category: 'job-boards',
    icon: '🏢',
    tags: ['glassdoor', 'salary', 'reviews', 'company-data'],
    avgRunTime: 75,
    avgResultCount: 150,
    successRate: 89,
    isFeatured: false,
    totalRuns: 32140,
    defaultInput: { maxResults: 100, includeSalary: true },
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
    defaultInput: { maxResults: 100 },
  },
  {
    actorId: 'upwork-scraper',
    name: 'upwork-freelance-scraper',
    title: 'Upwork Freelance Scraper',
    description:
      'Scrape freelance project listings from Upwork with budget, skills, and client data.',
    category: 'freelance',
    icon: '💻',
    tags: ['upwork', 'freelance', 'gig', 'projects'],
    avgRunTime: 45,
    avgResultCount: 120,
    successRate: 88,
    isFeatured: false,
    totalRuns: 21560,
    defaultInput: { maxResults: 50 },
  },
  {
    actorId: 'google-jobs-scraper',
    name: 'google-jobs-scraper',
    title: 'Google Jobs Scraper',
    description:
      'Extract job listings from Google Jobs search — aggregating hundreds of job boards in one query.',
    category: 'aggregators',
    icon: '🔎',
    tags: ['google', 'aggregator', 'universal', 'cross-platform'],
    avgRunTime: 40,
    avgResultCount: 400,
    successRate: 95,
    isFeatured: true,
    totalRuns: 89230,
    defaultInput: { maxResults: 150 },
  },
  {
    actorId: 'dice-tech-scraper',
    name: 'dice-tech-jobs-scraper',
    title: 'Dice Tech Jobs Scraper',
    description:
      'Scrape technology-focused job listings from Dice.com including salary data and tech stacks.',
    category: 'job-boards',
    icon: '🎲',
    tags: ['dice', 'tech', 'engineering', 'salary'],
    avgRunTime: 55,
    avgResultCount: 180,
    successRate: 93,
    isFeatured: false,
    totalRuns: 18920,
    defaultInput: { maxResults: 100 },
  },
  {
    actorId: 'company-careers-scraper',
    name: 'company-careers-scraper',
    title: 'Company Careers Page Scraper',
    description:
      'Scrape job listings directly from company career pages. Provide a list of company domains.',
    category: 'company-sites',
    icon: '🏗️',
    tags: ['career-pages', 'direct', 'company', 'custom'],
    avgRunTime: 120,
    avgResultCount: 80,
    successRate: 85,
    isFeatured: false,
    totalRuns: 9870,
    defaultInput: { maxResults: 50, domains: [] },
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');
  const featured = searchParams.get('featured');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
  const skip = (page - 1) * limit;

  try {
    const cacheKey = `actors:${category || 'all'}:${featured || 'all'}:${page}:${limit}`;
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    await connectDB();

    // Auto-seed if empty
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
    return NextResponse.json(response);
  } catch (error) {
    // Fallback: return seed data without DB
    console.warn('DB unavailable, returning mock actors:', (error as Error).message);
    const filtered = SEED_ACTORS.filter((a) => {
      if (category && category !== 'all' && a.category !== category) return false;
      if (featured === 'true' && !a.isFeatured) return false;
      return true;
    });
    const sliced = filtered.slice(skip, skip + limit);
    return NextResponse.json({
      actors: sliced.map((a) => ({ ...a, _id: a.actorId, isEnabled: true })),
      pagination: { page, limit, total: filtered.length, totalPages: Math.ceil(filtered.length / limit) },
    });
  }
}

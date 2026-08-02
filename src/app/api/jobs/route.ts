import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Job } from '@/models/Job';
import { cacheGet, cacheSet } from '@/lib/redis';
import { memoryJobStore } from '@/app/api/runs/route';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  const source = searchParams.get('source');
  const company = searchParams.get('company');
  const location = searchParams.get('location');
  const experienceLevel = searchParams.get('experienceLevel');
  const minSalaryStr = searchParams.get('minSalary');
  const minSalary = minSalaryStr ? parseInt(minSalaryStr) : 0;
  const remote = searchParams.get('remote');
  const runId = searchParams.get('runId');
  const skip = (page - 1) * limit;

  const cacheKey = `jobs:${source}:${company}:${location}:${experienceLevel}:${minSalary}:${remote}:${runId}:${page}:${limit}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return NextResponse.json(cached);

  try {
    await connectDB();

    const filter: Record<string, unknown> = { userId: '000000000000000000000001' };
    if (source) filter.source = source;
    if (company) filter.company = new RegExp(company, 'i');
    if (location) filter.location = new RegExp(location, 'i');
    if (experienceLevel) filter.experienceLevel = experienceLevel;
    if (minSalary > 0) filter['salary.max'] = { $gte: minSalary };
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

    const response = {
      jobs,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };

    await cacheSet(cacheKey, response, 60);
    return NextResponse.json(response);
  } catch {
    // Fallback: serve from in-memory job store
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
    if (remote === 'true') filtered = filtered.filter((j) => j.remote === true);
    if (runId) filtered = filtered.filter((j) => j.runId === runId);

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);
    return NextResponse.json({
      jobs: paginated,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  }
}

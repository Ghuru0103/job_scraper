import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Job } from '@/models/Job';
import { memoryJobStore } from '@/app/api/runs/route';

interface JobRecord {
  _id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: { min?: number; max?: number; currency?: string; period?: string; raw?: string };
  experienceLevel?: string;
  jobType?: string;
  skills?: string[];
  source: string;
  url: string;
  postedAt?: string;
  scrapedAt: string;
  [key: string]: unknown;
}

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source');
  const company = searchParams.get('company');
  const remote = searchParams.get('remote');
  const runId = searchParams.get('runId');

  let jobsList: JobRecord[] = [];

  try {
    await connectDB();
    const filter: Record<string, unknown> = { userId: '000000000000000000000001' };
    if (source) filter.source = source;
    if (company) filter.company = new RegExp(company, 'i');
    if (remote === 'true') filter.remote = true;
    if (runId) filter.runId = runId;

    const dbJobs = await Job.find(filter).sort({ scrapedAt: -1 }).lean();
    jobsList = dbJobs as unknown as JobRecord[];
  } catch {
    // Fallback to memory store if MongoDB is down
    let filtered = [...memoryJobStore] as JobRecord[];
    if (source) filtered = filtered.filter((j) => j.source === source);
    if (company) filtered = filtered.filter((j) => String(j.company).toLowerCase().includes(company.toLowerCase()));
    if (remote === 'true') filtered = filtered.filter((j) => j.remote === true);
    if (runId) filtered = filtered.filter((j) => j.runId === runId);
    jobsList = filtered;
  }

  // Define CSV headers
  const headers = [
    'Job ID',
    'Title',
    'Company',
    'Location',
    'Remote',
    'Min Salary',
    'Max Salary',
    'Currency',
    'Period',
    'Experience Level',
    'Job Type',
    'Skills',
    'Source',
    'Job URL',
    'Posted At',
    'Scraped At',
  ];

  // Map rows
  const rows = jobsList.map((job) => [
    escapeCSV(job._id),
    escapeCSV(job.title),
    escapeCSV(job.company),
    escapeCSV(job.location),
    escapeCSV(job.remote ? 'Yes' : 'No'),
    escapeCSV(job.salary?.min ?? ''),
    escapeCSV(job.salary?.max ?? ''),
    escapeCSV(job.salary?.currency ?? 'USD'),
    escapeCSV(job.salary?.period ?? 'yearly'),
    escapeCSV(job.experienceLevel ?? ''),
    escapeCSV(job.jobType ?? ''),
    escapeCSV(Array.isArray(job.skills) ? job.skills.join('; ') : ''),
    escapeCSV(job.source),
    escapeCSV(job.url),
    escapeCSV(job.postedAt ? new Date(job.postedAt).toISOString() : ''),
    escapeCSV(job.scrapedAt ? new Date(job.scrapedAt).toISOString() : ''),
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const filename = `job_results_${source || 'all'}_${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

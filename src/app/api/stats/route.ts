import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Run } from '@/models/Run';
import { Job } from '@/models/Job';
import { Actor } from '@/models/Actor';

const EMPTY_STATS = {
  overview: {
    totalRuns: 0, successfulRuns: 0, failedRuns: 0, runningRuns: 0,
    totalJobs: 0, jobsLast7Days: 0, totalActors: 8, successRate: 0,
  },
  recentRuns: [],
  topSources: [],
  dailyJobs: [],
};

export async function GET() {
  try {
    await connectDB();

    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalRuns,
      successfulRuns,
      failedRuns,
      runningRuns,
      totalJobs,
      jobsLast7Days,
      totalActors,
      recentRunsRaw,
      topSourcesRaw,
    ] = await Promise.all([
      Run.countDocuments(),
      Run.countDocuments({ status: 'succeeded' }),
      Run.countDocuments({ status: 'failed' }),
      Run.countDocuments({ status: 'running' }),
      Job.countDocuments(),
      Job.countDocuments({ scrapedAt: { $gte: last7Days } }),
      Actor.countDocuments({ isEnabled: true }),
      Run.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .select('actorName status stats.durationMs output.resultsCount createdAt')
        .lean(),
      Job.aggregate([
        { $match: { scrapedAt: { $gte: last30Days } } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
    ]);

    // Daily job counts for the past 14 days
    const dailyJobsRaw = await Job.aggregate([
      { $match: { scrapedAt: { $gte: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$scrapedAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const successRate = totalRuns > 0 ? Math.round((successfulRuns / totalRuns) * 100) : 0;

    return NextResponse.json({
      overview: {
        totalRuns,
        successfulRuns,
        failedRuns,
        runningRuns,
        totalJobs,
        jobsLast7Days,
        totalActors,
        successRate,
      },
      recentRuns: recentRunsRaw,
      topSources: topSourcesRaw.map((s: { _id: string; count: number }) => ({ source: s._id, count: s.count })),
      dailyJobs: dailyJobsRaw.map((d: { _id: string; count: number }) => ({ date: d._id, count: d.count })),
    });
  } catch (error) {
    console.warn('GET /api/stats DB unavailable, returning empty stats:', (error as Error).message);
    return NextResponse.json(EMPTY_STATS);
  }
}

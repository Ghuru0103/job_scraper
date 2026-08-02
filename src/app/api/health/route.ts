import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { getRedisClient } from '@/lib/redis';
import mongoose from 'mongoose';

export async function GET() {
  const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
  let overallStatus = 'healthy';

  // MongoDB check
  try {
    const start = Date.now();
    await connectDB();
    await mongoose.connection.db?.admin().ping();
    checks.mongodb = { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    checks.mongodb = { status: 'down', error: (err as Error).message };
    overallStatus = 'degraded';
  }

  // Redis check
  try {
    const start = Date.now();
    const client = getRedisClient();
    await client.ping();
    checks.redis = { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    checks.redis = { status: 'down', error: (err as Error).message };
    overallStatus = 'degraded';
  }

  // Memory check
  const mem = process.memoryUsage();
  checks.memory = {
    status: mem.heapUsed / mem.heapTotal < 0.9 ? 'ok' : 'warning',
    latencyMs: Math.round(mem.heapUsed / 1024 / 1024), // MB used
  };

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    },
    { status: overallStatus === 'healthy' ? 200 : 503 }
  );
}

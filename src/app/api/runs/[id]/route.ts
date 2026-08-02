import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Run } from '@/models/Run';
import { memoryRuns } from '../route';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();
    const run = await Run.findById(id).lean();
    if (run) return NextResponse.json({ run });
  } catch {
    // Fallback to memory runs
  }

  const memRun = memoryRuns.find((r) => r._id === id);
  if (memRun) {
    return NextResponse.json({ run: memRun });
  }
  return NextResponse.json({ error: 'Run not found' }, { status: 404 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    await connectDB();
    const run = await Run.findById(id);
    if (run) {
      if (run.status === 'running') {
        await Run.findByIdAndUpdate(id, { status: 'aborted' });
        return NextResponse.json({ message: 'Run aborted' });
      }
      await Run.findByIdAndDelete(id);
      return NextResponse.json({ message: 'Run deleted' });
    }
  } catch {
    // Fallback to memory runs
  }

  const index = memoryRuns.findIndex((r) => r._id === id);
  if (index !== -1) {
    if (memoryRuns[index].status === 'running') {
      memoryRuns[index].status = 'aborted';
      return NextResponse.json({ message: 'Run aborted' });
    }
    memoryRuns.splice(index, 1);
    return NextResponse.json({ message: 'Run deleted' });
  }

  return NextResponse.json({ error: 'Run not found' }, { status: 404 });
}

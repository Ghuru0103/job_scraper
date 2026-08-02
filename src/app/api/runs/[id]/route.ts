import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { Run } from '@/models/Run';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const run = await Run.findById(id).lean();
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (error) {
    console.error('GET /api/runs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch run' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;
    const run = await Run.findById(id);
    if (!run) {
      return NextResponse.json({ error: 'Run not found' }, { status: 404 });
    }
    if (run.status === 'running') {
      await Run.findByIdAndUpdate(id, { status: 'aborted' });
      return NextResponse.json({ message: 'Run aborted' });
    }
    await Run.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Run deleted' });
  } catch (error) {
    console.error('DELETE /api/runs/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete run' }, { status: 500 });
  }
}

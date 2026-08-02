import mongoose, { Document, Schema, Types } from 'mongoose';

export type RunStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'timed-out'
  | 'aborted';

export interface IRun extends Document {
  userId: Types.ObjectId;
  actorId: string;
  actorName: string;
  status: RunStatus;
  input: Record<string, unknown>;
  output?: {
    resultsCount: number;
    datasetId?: string;
    previewResults: unknown[];
  };
  stats: {
    startedAt?: Date;
    finishedAt?: Date;
    durationMs?: number;
    requestsTotal?: number;
    requestsFailed?: number;
    retryCount: number;
  };
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
  logs: Array<{
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    timestamp: Date;
  }>;
  webhookUrl?: string;
  apifyRunId?: string;
  proxyUsed: boolean;
  estimatedCost: number; // in USD
  createdAt: Date;
  updatedAt: Date;
}

const RunSchema = new Schema<IRun>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorId: { type: String, required: true, index: true },
    actorName: { type: String, required: true },
    status: {
      type: String,
      enum: ['pending', 'queued', 'running', 'succeeded', 'failed', 'timed-out', 'aborted'],
      default: 'pending',
      index: true,
    },
    input: { type: Schema.Types.Mixed, default: {} },
    output: {
      resultsCount: { type: Number, default: 0 },
      datasetId: String,
      previewResults: [Schema.Types.Mixed],
    },
    stats: {
      startedAt: Date,
      finishedAt: Date,
      durationMs: Number,
      requestsTotal: { type: Number, default: 0 },
      requestsFailed: { type: Number, default: 0 },
      retryCount: { type: Number, default: 0 },
    },
    error: {
      message: String,
      stack: String,
      code: String,
    },
    logs: [
      {
        level: { type: String, enum: ['info', 'warn', 'error', 'debug'] },
        message: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
    webhookUrl: String,
    apifyRunId: String,
    proxyUsed: { type: Boolean, default: false },
    estimatedCost: { type: Number, default: 0 },
  },
  { timestamps: true }
);

RunSchema.index({ userId: 1, createdAt: -1 });
RunSchema.index({ userId: 1, status: 1 });
RunSchema.index({ actorId: 1, status: 1 });

export const Run = mongoose.models.Run || mongoose.model<IRun>('Run', RunSchema);

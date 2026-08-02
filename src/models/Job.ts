import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IJob extends Document {
  runId: Types.ObjectId;
  userId: Types.ObjectId;
  source: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: {
    min?: number;
    max?: number;
    currency: string;
    period: 'hourly' | 'monthly' | 'yearly';
    raw?: string;
  };
  experienceLevel?: 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
  jobType?: 'full-time' | 'part-time' | 'contract' | 'internship' | 'freelance';
  description?: string;
  requirements?: string[];
  skills?: string[];
  url: string;
  applyUrl?: string;
  postedAt?: Date;
  scrapedAt: Date;
  expiresAt?: Date;
}

const JobSchema = new Schema<IJob>(
  {
    runId: { type: Schema.Types.ObjectId, ref: 'Run', required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    source: { type: String, required: true, index: true },
    title: { type: String, required: true },
    company: { type: String, required: true, index: true },
    location: { type: String, default: 'Unknown' },
    remote: { type: Boolean, default: false },
    salary: {
      min: Number,
      max: Number,
      currency: { type: String, default: 'USD' },
      period: { type: String, enum: ['hourly', 'monthly', 'yearly'] },
      raw: String,
    },
    experienceLevel: {
      type: String,
      enum: ['entry', 'mid', 'senior', 'lead', 'executive'],
    },
    jobType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'],
    },
    description: String,
    requirements: [String],
    skills: [String],
    url: { type: String, required: true },
    applyUrl: String,
    postedAt: Date,
    scrapedAt: { type: Date, default: Date.now },
    expiresAt: Date,
  },
  { timestamps: false }
);

// Compound indexes for performance optimization
JobSchema.index({ source: 1, scrapedAt: -1 });
JobSchema.index({ company: 1, location: 1 });
JobSchema.index({ userId: 1, scrapedAt: -1 });
JobSchema.index({ skills: 1 });
JobSchema.index({ remote: 1, source: 1 });

export const Job = mongoose.models.Job || mongoose.model<IJob>('Job', JobSchema);

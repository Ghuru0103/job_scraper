import mongoose, { Document, Schema } from 'mongoose';

export interface IActor extends Document {
  actorId: string;
  name: string;
  title: string;
  description: string;
  category: 'job-boards' | 'linkedin' | 'company-sites' | 'freelance' | 'remote' | 'aggregators';
  icon: string;
  tags: string[];
  inputSchema: {
    searchQuery?: { type: string; description: string; required: boolean };
    location?: { type: string; description: string; required: boolean };
    maxResults?: { type: string; description: string; default: number };
    remote?: { type: string; description: string; default: boolean };
    experienceLevel?: { type: string; enum: string[]; description: string };
    salary?: { type: string; description: string };
    [key: string]: unknown;
  };
  defaultInput: Record<string, unknown>;
  avgRunTime: number; // seconds
  avgResultCount: number;
  successRate: number; // 0-100
  isEnabled: boolean;
  isFeatured: boolean;
  totalRuns: number;
  version: string;
  createdAt: Date;
  updatedAt: Date;
}

const ActorSchema = new Schema<IActor>(
  {
    actorId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    category: {
      type: String,
      enum: ['job-boards', 'linkedin', 'company-sites', 'freelance', 'remote', 'aggregators'],
      required: true,
      index: true,
    },
    icon: { type: String, default: '🤖' },
    tags: [{ type: String }],
    inputSchema: { type: Schema.Types.Mixed, default: {} },
    defaultInput: { type: Schema.Types.Mixed, default: {} },
    avgRunTime: { type: Number, default: 60 },
    avgResultCount: { type: Number, default: 100 },
    successRate: { type: Number, default: 95, min: 0, max: 100 },
    isEnabled: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    totalRuns: { type: Number, default: 0 },
    version: { type: String, default: '1.0.0' },
  },
  { timestamps: true }
);

ActorSchema.index({ category: 1, isEnabled: 1 });
ActorSchema.index({ tags: 1 });

export const Actor = mongoose.models.Actor || mongoose.model<IActor>('Actor', ActorSchema);

import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  apiKey: string;
  role: 'user' | 'admin';
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  planLimits: {
    runsPerMonth: number;
    concurrentRuns: number;
    resultsRetentionDays: number;
  };
  usage: {
    runsThisMonth: number;
    totalRuns: number;
    totalResults: number;
    lastResetAt: Date;
  };
  proxyConfig?: {
    provider: string;
    username: string;
    password: string; // stored encrypted
    count: number;
  };
  notifications: {
    email: boolean;
    onSuccess: boolean;
    onFailure: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    apiKey: {
      type: String,
      unique: true,
      default: () => `sk_live_${crypto.randomBytes(32).toString('hex')}`,
      index: true,
    },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    plan: { type: String, enum: ['free', 'starter', 'pro', 'enterprise'], default: 'free' },
    planLimits: {
      runsPerMonth: { type: Number, default: 10 },
      concurrentRuns: { type: Number, default: 1 },
      resultsRetentionDays: { type: Number, default: 7 },
    },
    usage: {
      runsThisMonth: { type: Number, default: 0 },
      totalRuns: { type: Number, default: 0 },
      totalResults: { type: Number, default: 0 },
      lastResetAt: { type: Date, default: Date.now },
    },
    proxyConfig: {
      provider: String,
      username: String,
      password: String,
      count: { type: Number, default: 0 },
    },
    notifications: {
      email: { type: Boolean, default: true },
      onSuccess: { type: Boolean, default: false },
      onFailure: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

'use client';

import { RunStatus } from '@/models/Run';

interface RunCardProps {
  run: {
    _id: string;
    actorId: string;
    actorName: string;
    status: RunStatus;
    input: Record<string, unknown>;
    output?: { resultsCount: number };
    stats: {
      startedAt?: string;
      finishedAt?: string;
      durationMs?: number;
    };
    createdAt: string;
  };
  onAbort?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const statusConfig: Record<RunStatus, { color: string; bg: string; label: string; icon: string }> = {
  pending: { color: '#fcd34d', bg: 'rgba(245,158,11,0.1)', label: 'Pending', icon: '⏳' },
  queued: { color: '#67e8f9', bg: 'rgba(6,182,212,0.1)', label: 'Queued', icon: '📋' },
  running: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)', label: 'Running', icon: '⚡' },
  succeeded: { color: '#6ee7b7', bg: 'rgba(16,185,129,0.1)', label: 'Succeeded', icon: '✅' },
  failed: { color: '#fca5a5', bg: 'rgba(239,68,68,0.1)', label: 'Failed', icon: '❌' },
  'timed-out': { color: '#fcd34d', bg: 'rgba(245,158,11,0.1)', label: 'Timed Out', icon: '⏰' },
  aborted: { color: '#94a3b8', bg: 'rgba(71,85,105,0.2)', label: 'Aborted', icon: '🛑' },
};

function formatDuration(ms?: number): string {
  if (!ms) return '—';
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function RunCard({ run, onAbort, onDelete }: RunCardProps) {
  const cfg = statusConfig[run.status] || statusConfig.pending;

  return (
    <div
      className="card animate-fade-in"
      style={{
        padding: '1.25rem',
        borderLeft: `3px solid ${cfg.color}`,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        {/* Left info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.2rem 0.6rem',
                borderRadius: 'var(--radius-full)',
                background: cfg.bg,
                color: cfg.color,
                fontSize: '0.72rem',
                fontWeight: 700,
                border: `1px solid ${cfg.color}40`,
              }}
            >
              <span style={{ fontSize: '10px' }}>{cfg.icon}</span>
              {cfg.label}
              {run.status === 'running' && (
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    background: cfg.color,
                    animation: 'pulse 1.5s infinite',
                  }}
                />
              )}
            </span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {run.actorName || run.actorId}
            </span>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Results</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: run.output?.resultsCount ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                {run.output?.resultsCount ?? '—'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Duration</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {formatDuration(run.stats?.durationMs)}
              </div>
            </div>
            <div className="hide-sm">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Started</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {formatTime(run.stats?.startedAt)}
              </div>
            </div>
            <div className="hide-sm">
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.125rem' }}>Created</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {timeAgo(run.createdAt)}
              </div>
            </div>
          </div>

          {/* Run ID */}
          <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
            ID: {run._id}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
          {run.status === 'running' && onAbort && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => onAbort(run._id)}
            >
              ⏹ Abort
            </button>
          )}
          {['succeeded', 'failed', 'aborted', 'timed-out'].includes(run.status) && onDelete && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => onDelete(run._id)}
              style={{ color: 'var(--text-muted)' }}
            >
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

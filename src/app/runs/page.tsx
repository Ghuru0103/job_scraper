'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import RunCard from '@/components/RunCard';

interface Run {
  _id: string;
  actorId: string;
  actorName: string;
  status: 'pending' | 'queued' | 'running' | 'succeeded' | 'failed' | 'timed-out' | 'aborted';
  input: Record<string, unknown>;
  output?: { resultsCount: number; previewResults: unknown[] };
  stats: { startedAt?: string; finishedAt?: string; durationMs?: number };
  createdAt: string;
}

const STATUS_FILTERS = [
  { id: '', label: 'All', count: null },
  { id: 'running', label: 'Running', icon: '⚡' },
  { id: 'succeeded', label: 'Succeeded', icon: '✅' },
  { id: 'failed', label: 'Failed', icon: '❌' },
  { id: 'pending', label: 'Pending', icon: '⏳' },
];

export default function RunsPage() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchRuns = useCallback(async (page = 1) => {
    try {
      const params = new URLSearchParams({ page: String(page), limit: '10' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/runs?${params}`);
      const data = await res.json();
      setRuns(data.runs || []);
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch runs:', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchRuns(1);
  }, [fetchRuns]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => fetchRuns(pagination.page), 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchRuns, pagination.page]);

  const handleAbort = async (id: string) => {
    try {
      await fetch(`/api/runs/${id}`, { method: 'DELETE' });
      fetchRuns(pagination.page);
    } catch (err) {
      console.error('Abort failed:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/runs/${id}`, { method: 'DELETE' });
      setRuns((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const hasRunning = runs.some((r) => r.status === 'running' || r.status === 'pending');

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              ⚡ My Runs
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {pagination.total} total runs
              {hasRunning && (
                <span style={{ marginLeft: '0.5rem', color: 'var(--accent-green)', fontWeight: 600 }}>
                  • {runs.filter((r) => r.status === 'running').length} running
                </span>
              )}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {/* Auto-refresh toggle */}
            <button
              className="btn btn-sm"
              style={{
                background: autoRefresh ? 'rgba(16,185,129,0.1)' : 'var(--bg-card)',
                color: autoRefresh ? 'var(--accent-green)' : 'var(--text-secondary)',
                border: autoRefresh ? '1px solid rgba(16,185,129,0.25)' : '1px solid var(--border-subtle)',
              }}
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? (
                <><span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block' }}>🟢</span> Live</>
              ) : '⏸ Paused'}
            </button>
            <button className="btn btn-primary btn-sm" onClick={() => (window.location.href = '/')}>
              ⚡ New Run
            </button>
          </div>
        </div>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.id}
              className="btn btn-sm"
              style={{
                background: statusFilter === filter.id ? 'var(--gradient-primary)' : 'var(--bg-card)',
                color: statusFilter === filter.id ? 'white' : 'var(--text-secondary)',
                border: statusFilter === filter.id ? 'none' : '1px solid var(--border-subtle)',
              }}
              onClick={() => setStatusFilter(filter.id)}
            >
              {filter.icon && <span>{filter.icon}</span>}
              {filter.label}
            </button>
          ))}
        </div>

        {/* Runs list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : runs.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '5rem 2rem',
              color: 'var(--text-muted)',
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚡</div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              No runs yet
            </h3>
            <p style={{ marginBottom: '1.5rem' }}>
              {statusFilter ? `No ${statusFilter} runs found` : 'Start your first scraper from the Store'}
            </p>
            <button className="btn btn-primary" onClick={() => (window.location.href = '/')}>
              🏪 Browse Scrapers
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {runs.map((run) => (
              <RunCard
                key={run._id}
                run={run}
                onAbort={handleAbort}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page === 1}
              onClick={() => fetchRuns(pagination.page - 1)}
            >
              ← Prev
            </button>
            {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className="btn btn-sm"
                style={{
                  background: pagination.page === p ? 'var(--gradient-primary)' : 'var(--bg-card)',
                  color: pagination.page === p ? 'white' : 'var(--text-secondary)',
                  border: pagination.page === p ? 'none' : '1px solid var(--border-subtle)',
                  minWidth: '36px',
                }}
                onClick={() => fetchRuns(p)}
              >
                {p}
              </button>
            ))}
            <button
              className="btn btn-secondary btn-sm"
              disabled={pagination.page === pagination.totalPages}
              onClick={() => fetchRuns(pagination.page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

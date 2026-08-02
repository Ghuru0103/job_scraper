'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from 'recharts';

interface Stats {
  overview: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    runningRuns: number;
    totalJobs: number;
    jobsLast7Days: number;
    totalActors: number;
    successRate: number;
  };
  recentRuns: Array<{
    _id: string;
    actorName: string;
    status: string;
    'stats.durationMs'?: number;
    'output.resultsCount'?: number;
    createdAt: string;
  }>;
  topSources: Array<{ source: string; count: number }>;
  dailyJobs: Array<{ date: string; count: number }>;
}

const COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

const STAT_CARDS = [
  { key: 'totalRuns', label: 'Total Runs', icon: '⚡', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
  { key: 'successfulRuns', label: 'Successful', icon: '✅', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  { key: 'totalJobs', label: 'Jobs Scraped', icon: '💼', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  { key: 'jobsLast7Days', label: 'Jobs (7 days)', icon: '📈', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
  { key: 'successRate', label: 'Success Rate', icon: '🎯', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', suffix: '%' },
  { key: 'totalActors', label: 'Active Scrapers', icon: '🤖', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
];

function formatNum(n: number | undefined): string {
  if (n === undefined) return '—';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toString();
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.overview) setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(() => fetchStats(true), 30000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-medium)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            fontSize: '0.8125rem',
          }}
        >
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{label}</p>
          <p style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>{payload[0].value} jobs</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              📊 Dashboard
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Real-time performance overview — auto-refreshes every 30s
            </p>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => fetchStats(true)}
            disabled={refreshing}
          >
            {refreshing ? <span className="animate-spin">⚙️</span> : '🔄'} Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '2rem',
              }}
            >
              {STAT_CARDS.map((card) => {
                const val = (stats?.overview as Record<string, number> | undefined)?.[card.key] ?? 0;
                return (
                  <div key={card.key} className="stat-card animate-fade-in">
                    <div
                      className="stat-icon"
                      style={{ background: card.bg, fontSize: '1.25rem' }}
                    >
                      {card.icon}
                    </div>
                    <div className="stat-value" style={{ color: card.color }}>
                      {formatNum(val)}{card.suffix || ''}
                    </div>
                    <div className="stat-label">{card.label}</div>
                    <div
                      style={{
                        height: '3px',
                        background: card.bg,
                        borderRadius: 'var(--radius-full)',
                        marginTop: '0.75rem',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${Math.min((val / Math.max((stats?.overview?.totalRuns ?? 1), 1)) * 100, 100)}%`,
                          background: card.color,
                          borderRadius: 'var(--radius-full)',
                          transition: 'width 1s ease',
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts row */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '1.25rem',
                marginBottom: '2rem',
              }}
            >
              {/* Daily jobs chart */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                  📈 Jobs Scraped (14 days)
                </h3>
                {stats?.dailyJobs && stats.dailyJobs.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={stats.dailyJobs}>
                      <defs>
                        <linearGradient id="jobsGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatDate}
                        tick={{ fill: '#475569', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#475569', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#jobsGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.875rem',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>📊</span>
                    <span>Run scrapers to see data</span>
                  </div>
                )}
              </div>

              {/* Top sources bar chart */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                  🏆 Top Sources (30 days)
                </h3>
                {stats?.topSources && stats.topSources.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={stats.topSources} barSize={28}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" vertical={false} />
                      <XAxis
                        dataKey="source"
                        tick={{ fill: '#475569', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#475569', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-medium)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)',
                          fontSize: '0.8125rem',
                        }}
                      />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {stats.topSources.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div
                    style={{
                      height: '200px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--text-muted)',
                      fontSize: '0.875rem',
                      flexDirection: 'column',
                      gap: '0.5rem',
                    }}
                  >
                    <span style={{ fontSize: '2rem' }}>📊</span>
                    <span>No data yet</span>
                  </div>
                )}
              </div>
            </div>

            {/* Run status breakdown & Recent runs */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '280px 1fr',
                gap: '1.25rem',
              }}
            >
              {/* Status donut */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.5rem', color: 'var(--text-primary)' }}>
                  🎯 Run Status
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Succeeded', value: stats?.overview.successfulRuns || 0, color: '#10b981' },
                        { name: 'Failed', value: stats?.overview.failedRuns || 0, color: '#ef4444' },
                        { name: 'Running', value: stats?.overview.runningRuns || 0, color: '#6366f1' },
                      ].filter((d) => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {[
                        { color: '#10b981' }, { color: '#ef4444' }, { color: '#6366f1' },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-medium)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        fontSize: '0.8125rem',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {[
                    { label: 'Succeeded', value: stats?.overview.successfulRuns, color: '#10b981' },
                    { label: 'Failed', value: stats?.overview.failedRuns, color: '#ef4444' },
                    { label: 'Running', value: stats?.overview.runningRuns, color: '#6366f1' },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                        <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: item.color }}>{item.value || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent runs table */}
              <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
                <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                  🕐 Recent Runs
                </h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Scraper</th>
                        <th>Status</th>
                        <th>Results</th>
                        <th>Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.recentRuns && stats.recentRuns.length > 0 ? (
                        stats.recentRuns.map((run) => (
                          <tr key={run._id}>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {run.actorName || run._id}
                            </td>
                            <td>
                              <span
                                style={{
                                  padding: '0.15rem 0.5rem',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  background: run.status === 'succeeded' ? 'rgba(16,185,129,0.15)' :
                                    run.status === 'failed' ? 'rgba(239,68,68,0.15)' :
                                    run.status === 'running' ? 'rgba(99,102,241,0.15)' : 'rgba(71,85,105,0.2)',
                                  color: run.status === 'succeeded' ? '#6ee7b7' :
                                    run.status === 'failed' ? '#fca5a5' :
                                    run.status === 'running' ? '#a5b4fc' : '#94a3b8',
                                }}
                              >
                                {run.status}
                              </span>
                            </td>
                            <td style={{ fontWeight: 600, color: 'var(--accent-green)' }}>
                              {(run as Record<string, unknown>)['output']
                                ? ((run as Record<string, unknown>)['output'] as Record<string, unknown>)['resultsCount'] ?? '—'
                                : '—'}
                            </td>
                            <td style={{ fontSize: '0.8rem' }}>
                              {new Date(run.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                            No runs yet — start a scraper from the Store
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';

interface HealthData {
  status: string;
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    mongodb: { status: string; latencyMs?: number; error?: string };
    redis: { status: string; latencyMs?: number; error?: string };
    memory: { status: string; latencyMs?: number }; // latencyMs = MB used
  };
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (m) parts.push(`${m}m`);
  return parts.join(' ') || '< 1m';
}

const ALERTS = [
  { id: 'HighErrorRate', severity: 'warning', title: 'High Error Rate', expr: "rate(http_requests_total{status=~'5..'}[5m]) > 0.05", description: 'Triggers when 5xx error rate exceeds 5% over 5 minutes' },
  { id: 'DatabaseDown', severity: 'critical', title: 'Database Down', expr: 'up{job="mongodb"} == 0', description: 'Triggers when MongoDB becomes unreachable' },
  { id: 'DiskSpaceLow', severity: 'warning', title: 'Disk Space Low', expr: 'node_filesystem_avail_bytes / node_filesystem_size_bytes < 0.1', description: 'Triggers when available disk space drops below 10%' },
  { id: 'QueueDepth', severity: 'info', title: 'Queue Depth', expr: 'queue_depth > 100', description: 'Triggers when job queue has more than 100 pending tasks' },
];

const ENDPOINTS = [
  { path: '/api/actors', method: 'GET', description: 'List all scrapers', cached: true },
  { path: '/api/runs', method: 'POST', description: 'Start a scraper run', cached: false },
  { path: '/api/runs', method: 'GET', description: 'List recent runs', cached: false },
  { path: '/api/jobs', method: 'GET', description: 'Get scraped job results', cached: true },
  { path: '/api/stats', method: 'GET', description: 'Aggregated statistics', cached: false },
  { path: '/api/metrics', method: 'GET', description: 'Prometheus metrics', cached: false },
  { path: '/api/health', method: 'GET', description: 'System health check', cached: false },
];

export default function MonitoringPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [endpointLatencies, setEndpointLatencies] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'health' | 'alerts' | 'endpoints' | 'config'>('health');

  const fetchHealth = useCallback(async () => {
    try {
      const start = Date.now();
      const res = await fetch('/api/health');
      const latency = Date.now() - start;
      const data = await res.json();
      setHealth(data);
      setEndpointLatencies((prev) => ({ ...prev, '/api/health': latency }));
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Health check failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  const testEndpoint = async (path: string, method: string) => {
    const start = Date.now();
    try {
      await fetch(path, { method });
      setEndpointLatencies((prev) => ({ ...prev, [path]: Date.now() - start }));
    } catch {
      setEndpointLatencies((prev) => ({ ...prev, [path]: -1 }));
    }
  };

  const statusColor = (status: string) => {
    if (status === 'up' || status === 'ok' || status === 'healthy') return 'var(--accent-green)';
    if (status === 'warning' || status === 'degraded') return 'var(--accent-orange)';
    return 'var(--accent-red)';
  };

  const tabs = [
    { id: 'health', label: '❤️ Health', },
    { id: 'alerts', label: '🔔 Alerts' },
    { id: 'endpoints', label: '🔌 Endpoints' },
    { id: 'config', label: '⚙️ Config' },
  ];

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              📡 Monitoring
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Last refresh: {lastRefresh.toLocaleTimeString()} · Auto-refreshes every 15s
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            {health && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                  background: health.status === 'healthy' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                  border: `1px solid ${health.status === 'healthy' ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  color: health.status === 'healthy' ? 'var(--accent-green)' : 'var(--accent-orange)',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: health.status === 'healthy' ? 'var(--accent-green)' : 'var(--accent-orange)', animation: 'pulse 1.5s infinite' }} />
                {health.status.toUpperCase()}
              </div>
            )}
            <button className="btn btn-secondary btn-sm" onClick={fetchHealth}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.5rem', padding: '0.25rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className="btn btn-sm"
              style={{
                background: activeTab === tab.id ? 'var(--gradient-primary)' : 'transparent',
                color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
                border: 'none',
                padding: '0.5rem 1rem',
              }}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Health tab */}
        {activeTab === 'health' && (
          <div className="animate-fade-in">
            {loading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: '120px', borderRadius: 'var(--radius-lg)' }} />
                ))}
              </div>
            ) : health ? (
              <>
                {/* System info */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                  {[
                    { label: 'Uptime', value: formatUptime(health.uptime), icon: '⏱️', color: 'var(--accent-primary)' },
                    { label: 'Version', value: health.version, icon: '📦', color: 'var(--accent-tertiary)' },
                    { label: 'DB Latency', value: health.checks.mongodb.latencyMs ? `${health.checks.mongodb.latencyMs}ms` : 'Down', icon: '🗄️', color: health.checks.mongodb.status === 'up' ? 'var(--accent-green)' : 'var(--accent-red)' },
                    { label: 'Redis Latency', value: health.checks.redis.latencyMs ? `${health.checks.redis.latencyMs}ms` : 'Down', icon: '⚡', color: health.checks.redis.status === 'up' ? 'var(--accent-green)' : 'var(--accent-red)' },
                    { label: 'Memory Used', value: `${health.checks.memory.latencyMs}MB`, icon: '💾', color: 'var(--accent-orange)' },
                  ].map((item) => (
                    <div key={item.label} className="stat-card">
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                      <div style={{ fontSize: '1.375rem', fontWeight: 800, color: item.color, marginBottom: '0.25rem' }}>
                        {item.value}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.label}</div>
                    </div>
                  ))}
                </div>

                {/* Service status */}
                <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)' }}>
                    🔌 Service Status
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(health.checks).map(([service, check]) => (
                      <div
                        key={service}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.875rem 1rem',
                          background: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '10px',
                              height: '10px',
                              borderRadius: '50%',
                              background: statusColor(check.status),
                              boxShadow: `0 0 8px ${statusColor(check.status)}`,
                              animation: check.status === 'up' ? 'pulse 2s infinite' : 'none',
                            }}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize', fontSize: '0.9rem' }}>
                            {service === 'mongodb' ? 'MongoDB' : service === 'redis' ? 'Redis' : 'Memory'}
                          </span>
                          {check.error && (
                            <span style={{ fontSize: '0.75rem', color: 'var(--accent-red)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {check.error}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', align: 'center', gap: '1rem', fontSize: '0.875rem' }}>
                          {check.latencyMs !== undefined && (
                            <span style={{ color: 'var(--text-muted)' }}>
                              {service === 'memory' ? `${check.latencyMs}MB` : `${check.latencyMs}ms`}
                            </span>
                          )}
                          <span
                            style={{
                              fontWeight: 700,
                              color: statusColor(check.status),
                              fontSize: '0.8rem',
                              textTransform: 'uppercase',
                            }}
                          >
                            {check.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Prometheus hint */}
                <div
                  style={{
                    padding: '1.25rem',
                    background: 'rgba(99,102,241,0.05)',
                    border: '1px solid rgba(99,102,241,0.15)',
                    borderRadius: 'var(--radius-lg)',
                    display: 'flex',
                    gap: '1rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ fontSize: '1.5rem' }}>📊</div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                      Prometheus Metrics Available
                    </div>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                      Scrape metrics at <code style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--accent-primary)', background: 'var(--bg-elevated)', padding: '0.125rem 0.375rem', borderRadius: '4px' }}>/api/metrics</code> for Grafana integration.
                      Includes HTTP request rates, scraper durations, cache hits, and queue depths.
                    </div>
                    <a
                      href="/api/metrics"
                      target="_blank"
                      className="btn btn-secondary btn-sm"
                      style={{ textDecoration: 'none', display: 'inline-flex' }}
                    >
                      View Raw Metrics →
                    </a>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                Health check failed — services may be unreachable
              </div>
            )}
          </div>
        )}

        {/* Alerts tab */}
        {activeTab === 'alerts' && (
          <div className="animate-fade-in">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Prometheus alerting rules configured for production deployment. Import into Alertmanager.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {ALERTS.map((alert) => (
                <div
                  key={alert.id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    borderLeft: `3px solid ${alert.severity === 'critical' ? 'var(--accent-red)' : alert.severity === 'warning' ? 'var(--accent-orange)' : 'var(--accent-tertiary)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{alert.title}</div>
                    <span
                      className={`badge ${alert.severity === 'critical' ? 'badge-red' : alert.severity === 'warning' ? 'badge-orange' : 'badge-blue'}`}
                    >
                      {alert.severity}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                    {alert.description}
                  </p>
                  <code
                    style={{
                      display: 'block',
                      padding: '0.625rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.8rem',
                      fontFamily: 'JetBrains Mono, monospace',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    {alert.expr}
                  </code>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Endpoints tab */}
        {activeTab === 'endpoints' && (
          <div className="animate-fade-in">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Test API endpoint latencies. Click &quot;Ping&quot; to measure response time.
            </p>
            <div className="card" style={{ overflow: 'hidden' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Method</th>
                    <th>Endpoint</th>
                    <th>Description</th>
                    <th>Cached</th>
                    <th>Latency</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {ENDPOINTS.map((ep) => {
                    const latency = endpointLatencies[ep.path];
                    return (
                      <tr key={`${ep.method}-${ep.path}`}>
                        <td>
                          <span
                            className={`badge ${ep.method === 'GET' ? 'badge-blue' : 'badge-green'}`}
                          >
                            {ep.method}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
                            {ep.path}
                          </code>
                        </td>
                        <td style={{ fontSize: '0.8125rem' }}>{ep.description}</td>
                        <td>{ep.cached ? <span className="badge badge-green">✓ Redis</span> : <span className="badge badge-gray">No</span>}</td>
                        <td>
                          {latency !== undefined ? (
                            <span style={{ fontWeight: 700, fontFamily: 'JetBrains Mono, monospace', color: latency < 100 ? 'var(--accent-green)' : latency < 500 ? 'var(--accent-orange)' : 'var(--accent-red)' }}>
                              {latency < 0 ? 'Error' : `${latency}ms`}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          <button className="btn btn-ghost btn-sm" onClick={() => testEndpoint(ep.path, ep.method)}>
                            Ping
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Config tab */}
        {activeTab === 'config' && (
          <div className="animate-fade-in">
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
              Production configuration reference. Set these as environment variables.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              {[
                {
                  title: '🗄️ Database',
                  vars: [
                    { key: 'MONGODB_URI', desc: 'MongoDB connection string (supports replica sets)', example: 'mongodb://user:pass@host:27017/db?replicaSet=rs0' },
                    { key: 'MONGODB_POOL_SIZE', desc: 'Max connection pool size', example: '20' },
                  ],
                },
                {
                  title: '⚡ Redis',
                  vars: [
                    { key: 'REDIS_URL', desc: 'Redis connection string', example: 'redis://:password@localhost:6379' },
                  ],
                },
                {
                  title: '🔐 Security',
                  vars: [
                    { key: 'JWT_SECRET', desc: 'JWT signing secret (32+ chars)', example: '$(openssl rand -base64 32)' },
                    { key: 'ENCRYPTION_KEY', desc: 'AES-256 key for field encryption', example: '$(openssl rand -hex 32)' },
                    { key: 'ALLOWED_ORIGINS', desc: 'CORS allowed origins', example: 'https://app.yourdomain.com' },
                  ],
                },
                {
                  title: '📝 Logging',
                  vars: [
                    { key: 'LOG_LEVEL', desc: 'Winston log level', example: 'info' },
                    { key: 'LOG_TO_FILE', desc: 'Enable file logging', example: 'true' },
                    { key: 'LOG_FILE_PATH', desc: 'Log file location', example: '/var/log/antigravity/app.log' },
                    { key: 'SENTRY_DSN', desc: 'Sentry error tracking DSN', example: 'https://...' },
                  ],
                },
                {
                  title: '🌐 Proxies',
                  vars: [
                    { key: 'PROXY_PROVIDER', desc: 'Proxy service provider', example: 'brightdata' },
                    { key: 'PROXY_COUNT', desc: 'Number of proxy IPs', example: '50' },
                    { key: 'PROXY_ROTATION_ENABLED', desc: 'Enable automatic rotation', example: 'true' },
                  ],
                },
                {
                  title: '☁️ Storage',
                  vars: [
                    { key: 'STORAGE_TYPE', desc: 'Result storage backend', example: 's3' },
                    { key: 'AWS_S3_BUCKET', desc: 'S3 bucket for results', example: 'antigravity-results' },
                    { key: 'AWS_REGION', desc: 'AWS region', example: 'us-east-1' },
                  ],
                },
              ].map((section) => (
                <div key={section.title} className="card" style={{ padding: '1.25rem' }}>
                  <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
                    {section.title}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {section.vars.map((v) => (
                      <div key={v.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                          <code style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                            {v.key}
                          </code>
                        </div>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>{v.desc}</p>
                        <code style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-secondary)', background: 'var(--bg-secondary)', padding: '0.25rem 0.5rem', borderRadius: '4px', fontFamily: 'JetBrains Mono, monospace' }}>
                          {v.example}
                        </code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

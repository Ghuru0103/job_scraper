'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: { min?: number; max?: number; currency: string; period: string; raw?: string };
  source: string;
  url: string;
  skills?: string[];
  experienceLevel?: string;
  jobType?: string;
  postedAt?: string;
  scrapedAt: string;
}

const EXPERIENCE_COLORS: Record<string, string> = {
  entry: 'badge-green',
  mid: 'badge-blue',
  senior: 'badge-purple',
  lead: 'badge-orange',
  executive: 'badge-pink',
};

function formatSalary(salary?: Job['salary']): string {
  if (!salary) return '—';
  if (salary.raw) return salary.raw;
  const { min, max, currency, period } = salary;
  const fmt = (n?: number) => n ? `${currency}${(n / 1000).toFixed(0)}k` : null;
  const range = [fmt(min), fmt(max)].filter(Boolean).join(' - ');
  return range ? `${range}/${period === 'yearly' ? 'yr' : period}` : '—';
}

function timeAgo(iso?: string): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const ALL_SOURCES = [
  'linkedin-jobs',
  'indeed-scraper',
  'glassdoor-scraper',
  'remote-ok-scraper',
  'upwork-scraper',
  'google-jobs-scraper',
  'dice-tech-scraper',
  'company-careers-scraper',
];

function JobsContent() {
  const searchParams = useSearchParams();
  const initialSource = searchParams?.get('source') || '';

  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [experienceFilter, setExperienceFilter] = useState('');
  const [minSalaryFilter, setMinSalaryFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState(initialSource);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const fetchJobs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (sourceFilter) params.set('source', sourceFilter);
      if (remoteOnly) params.set('remote', 'true');
      if (search) params.set('company', search);
      if (locationSearch) params.set('location', locationSearch);
      if (experienceFilter) params.set('experienceLevel', experienceFilter);
      if (minSalaryFilter) params.set('minSalary', minSalaryFilter);
      const res = await fetch(`/api/jobs?${params}`);
      const data = await res.json();
      setJobs(data.jobs || []);
      setPagination(data.pagination || { page: 1, total: 0, totalPages: 1 });
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setLoading(false);
    }
  }, [sourceFilter, remoteOnly, search, locationSearch, experienceFilter, minSalaryFilter]);

  useEffect(() => { fetchJobs(1); }, [fetchJobs]);

  const sources = Array.from(new Set([...ALL_SOURCES, ...jobs.map((j) => j.source)]));

  const handleExportCSV = () => {
    const params = new URLSearchParams();
    if (sourceFilter) params.set('source', sourceFilter);
    if (remoteOnly) params.set('remote', 'true');
    if (search) params.set('company', search);
    if (locationSearch) params.set('location', locationSearch);
    if (experienceFilter) params.set('experienceLevel', experienceFilter);
    if (minSalaryFilter) params.set('minSalary', minSalaryFilter);
    window.open(`/api/jobs/export?${params.toString()}`, '_blank');
  };

  const clearAllFilters = () => {
    setSearch('');
    setLocationSearch('');
    setSourceFilter('');
    setExperienceFilter('');
    setMinSalaryFilter('');
    setRemoteOnly(false);
  };

  const hasActiveFilters = search || locationSearch || sourceFilter || experienceFilter || minSalaryFilter || remoteOnly;

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      <main className="container" style={{ padding: '2rem 1.5rem' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              💼 Job Results
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              {pagination.total.toLocaleString()} jobs scraped
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Export CSV button */}
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleExportCSV}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.375rem',
                fontWeight: 600,
                borderColor: 'var(--border-subtle)',
              }}
            >
              📥 Export CSV
            </button>

            {/* View toggle */}
            <div style={{ display: 'flex', gap: '0.375rem', padding: '0.25rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
              {(['grid', 'table'] as const).map((mode) => (
                <button
                  key={mode}
                  className="btn btn-sm"
                  style={{
                    background: viewMode === mode ? 'var(--gradient-primary)' : 'transparent',
                    color: viewMode === mode ? 'white' : 'var(--text-muted)',
                    border: 'none',
                    padding: '0.375rem 0.75rem',
                  }}
                  onClick={() => setViewMode(mode)}
                >
                  {mode === 'grid' ? '⊞' : '☰'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Filters bar */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            padding: '1rem',
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)',
            alignItems: 'center',
          }}
        >
          {/* Company Search */}
          <div className="input-group" style={{ flex: '1 1 180px', minWidth: '150px' }}>
            <span className="input-icon">🏢</span>
            <input
              className="input"
              placeholder="Filter company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Location Search */}
          <div className="input-group" style={{ flex: '1 1 180px', minWidth: '150px' }}>
            <span className="input-icon">📍</span>
            <input
              className="input"
              placeholder="Filter location..."
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
            />
          </div>

          {/* Source Select */}
          <select className="input" style={{ minWidth: '140px', flex: '0 0 auto' }} value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)}>
            <option value="">All Sources</option>
            {sources.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          {/* Experience Level Select */}
          <select className="input" style={{ minWidth: '140px', flex: '0 0 auto' }} value={experienceFilter} onChange={(e) => setExperienceFilter(e.target.value)}>
            <option value="">All Levels</option>
            <option value="entry">🌱 Entry Level</option>
            <option value="mid">⚡ Mid Level</option>
            <option value="senior">🔥 Senior Level</option>
            <option value="lead">👑 Lead Level</option>
            <option value="executive">🚀 Executive</option>
          </select>

          {/* Salary Threshold Select */}
          <select className="input" style={{ minWidth: '140px', flex: '0 0 auto' }} value={minSalaryFilter} onChange={(e) => setMinSalaryFilter(e.target.value)}>
            <option value="">Any Salary</option>
            <option value="60000">💰 $60k+ / yr</option>
            <option value="80000">💰 $80k+ / yr</option>
            <option value="100000">💰 $100k+ / yr</option>
            <option value="120000">💰 $120k+ / yr</option>
            <option value="150000">💰 $150k+ / yr</option>
          </select>

          {/* Remote Toggle */}
          <button
            className="btn btn-sm"
            style={{
              background: remoteOnly ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)',
              color: remoteOnly ? 'var(--accent-green)' : 'var(--text-secondary)',
              border: remoteOnly ? '1px solid rgba(16,185,129,0.3)' : '1px solid var(--border-subtle)',
            }}
            onClick={() => setRemoteOnly(!remoteOnly)}
          >
            🌍 Remote Only
          </button>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={clearAllFilters}
              style={{ color: 'var(--accent-red)', fontWeight: 600 }}
            >
              ✕ Clear Filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '180px', borderRadius: 'var(--radius-lg)' }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>💼</div>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              No jobs found
            </h3>
            <p style={{ marginBottom: '1.5rem' }}>Run some scrapers to collect job data</p>
            <button className="btn btn-primary" onClick={() => (window.location.href = '/')}>
              🤖 Go to Store
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {jobs.map((job) => (
              <div
                key={job._id}
                className="card"
                style={{ padding: '1.25rem', cursor: 'pointer' }}
                onClick={() => setSelectedJob(job)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.title}
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontWeight: 500 }}>{job.company}</p>
                  </div>
                  {job.remote && (
                    <span className="badge badge-green" style={{ marginLeft: '0.5rem', alignSelf: 'flex-start', flexShrink: 0 }}>🌍 Remote</span>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  <span>📍 {job.location}</span>
                  {job.salary && <span style={{ color: 'var(--accent-green)' }}>💰 {formatSalary(job.salary)}</span>}
                </div>

                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {job.experienceLevel && (
                    <span className={`badge ${EXPERIENCE_COLORS[job.experienceLevel] || 'badge-gray'}`}>
                      {job.experienceLevel}
                    </span>
                  )}
                  {job.jobType && <span className="badge badge-gray">{job.jobType}</span>}
                  <span className="badge badge-purple">{job.source}</span>
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {job.skills.slice(0, 3).map((skill) => (
                      <span key={skill} className="tag" style={{ fontSize: '0.7rem' }}>{skill}</span>
                    ))}
                    {job.skills.length > 3 && (
                      <span className="tag" style={{ fontSize: '0.7rem' }}>+{job.skills.length - 3}</span>
                    )}
                  </div>
                )}

                <div style={{ marginTop: '0.875rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  <span>Posted {timeAgo(job.postedAt)}</span>
                  <span>Scraped {timeAgo(job.scrapedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Table view */
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Company</th>
                    <th>Location</th>
                    <th>Salary</th>
                    <th>Level</th>
                    <th>Source</th>
                    <th>Posted</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job._id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500, maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.title}
                      </td>
                      <td style={{ fontWeight: 500 }}>{job.company}</td>
                      <td>
                        {job.remote ? (
                          <span className="badge badge-green">🌍 Remote</span>
                        ) : job.location}
                      </td>
                      <td style={{ color: 'var(--accent-green)', fontWeight: 600 }}>{formatSalary(job.salary)}</td>
                      <td>
                        {job.experienceLevel && (
                          <span className={`badge ${EXPERIENCE_COLORS[job.experienceLevel] || 'badge-gray'}`}>
                            {job.experienceLevel}
                          </span>
                        )}
                      </td>
                      <td><span className="badge badge-purple">{job.source}</span></td>
                      <td>{timeAgo(job.postedAt)}</td>
                      <td>
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-ghost btn-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Apply →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
            <button className="btn btn-secondary btn-sm" disabled={pagination.page === 1} onClick={() => fetchJobs(pagination.page - 1)}>
              ← Prev
            </button>
            <span style={{ padding: '0.5rem 1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {pagination.page} / {pagination.totalPages}
            </span>
            <button className="btn btn-secondary btn-sm" disabled={pagination.page === pagination.totalPages} onClick={() => fetchJobs(pagination.page + 1)}>
              Next →
            </button>
          </div>
        )}
      </main>

      {/* Job detail modal */}
      {selectedJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="card animate-scale-in"
            style={{ maxWidth: '560px', width: '100%', padding: '2rem', maxHeight: '80vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.375rem' }}>
                  {selectedJob.title}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{selectedJob.company}</p>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedJob(null)}>✕</button>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {selectedJob.remote && <span className="badge badge-green">🌍 Remote</span>}
              {selectedJob.experienceLevel && <span className={`badge ${EXPERIENCE_COLORS[selectedJob.experienceLevel] || 'badge-gray'}`}>{selectedJob.experienceLevel}</span>}
              {selectedJob.jobType && <span className="badge badge-gray">{selectedJob.jobType}</span>}
              <span className="badge badge-purple">{selectedJob.source}</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>📍 {selectedJob.location}</div>
              </div>
              <div style={{ padding: '0.875rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Salary</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-green)' }}>💰 {formatSalary(selectedJob.salary)}</div>
              </div>
            </div>

            {selectedJob.skills && selectedJob.skills.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.625rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Skills</div>
                <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
                  {selectedJob.skills.map((skill) => (
                    <span key={skill} className="tag">{skill}</span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <a
                href={selectedJob.url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{ flex: 1, textDecoration: 'none' }}
              >
                Apply Now →
              </a>
              <button className="btn btn-secondary" onClick={() => setSelectedJob(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function JobsPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading jobs...</div>}>
      <JobsContent />
    </Suspense>
  );
}

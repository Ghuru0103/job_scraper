'use client';

import { useState } from 'react';

interface ActorCardProps {
  actor: {
    actorId: string;
    name: string;
    title: string;
    description: string;
    category: string;
    icon: string;
    tags: string[];
    avgRunTime: number;
    avgResultCount: number;
    successRate: number;
    isFeatured: boolean;
    totalRuns: number;
  };
  onRun: (actorId: string, input: Record<string, unknown>) => void;
  isRunning?: boolean;
}

const categoryColors: Record<string, string> = {
  'linkedin': 'badge-blue',
  'job-boards': 'badge-purple',
  'remote': 'badge-green',
  'freelance': 'badge-orange',
  'company-sites': 'badge-pink',
  'aggregators': 'badge-gray',
};

const categoryLabels: Record<string, string> = {
  'linkedin': 'LinkedIn',
  'job-boards': 'Job Boards',
  'remote': 'Remote',
  'freelance': 'Freelance',
  'company-sites': 'Company Sites',
  'aggregators': 'Aggregators',
};

export default function ActorCard({ actor, onRun, isRunning }: ActorCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('MEAN stack, Angular, Node.js, Java');
  const [location, setLocation] = useState('Chennai, Madurai');
  const [experience, setExperience] = useState('2 years');
  const [maxResults, setMaxResults] = useState(100);

  const handleRun = () => {
    onRun(actor.actorId, {
      searchQuery: searchQuery || undefined,
      location: location || undefined,
      experience: experience || undefined,
      maxResults,
    });
  };

  const formatRuns = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return n.toString();
  };

  return (
    <div
      className="card animate-fade-in"
      style={{
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start', flex: 1 }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '10px',
              background: 'var(--gradient-card)',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0,
            }}
          >
            {actor.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                {actor.title}
              </h3>
              {actor.isFeatured && (
                <span className="badge badge-orange" style={{ fontSize: '0.65rem' }}>⭐ Featured</span>
              )}
            </div>
            <span className={`badge ${categoryColors[actor.category] || 'badge-gray'}`} style={{ marginTop: '0.25rem' }}>
              {categoryLabels[actor.category] || actor.category}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '1rem' }}>
        {actor.description}
      </p>

      {/* Tags */}
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {actor.tags.slice(0, 3).map((tag) => (
          <span key={tag} className="tag">{tag}</span>
        ))}
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.5rem',
          padding: '0.875rem',
          background: 'var(--bg-secondary)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '1rem',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-green)' }}>
            {actor.successRate}%
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Success</div>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-tertiary)' }}>
            ~{actor.avgResultCount}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Avg Results</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            {formatRuns(actor.totalRuns)}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Total Runs</div>
        </div>
      </div>

      {/* Run time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <span>⏱️</span>
        <span>Avg runtime: ~{actor.avgRunTime}s</span>
      </div>

      {/* Expandable config */}
      {expanded && (
        <div
          className="animate-fade-in"
          style={{
            padding: '1rem',
            background: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tech Stack / Search Keywords
            </label>
            <input
              className="input"
              placeholder="e.g. MEAN stack, Angular, Node.js, Java"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Location(s)
            </label>
            <input
              className="input"
              placeholder="e.g. Chennai, Madurai"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Required Experience
            </label>
            <input
              className="input"
              placeholder="e.g. 2 years"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.375rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Max Results: {maxResults}
            </label>
            <input
              type="range"
              min={10}
              max={500}
              step={10}
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
            />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          className="btn btn-primary"
          style={{ flex: 1 }}
          onClick={handleRun}
          disabled={isRunning}
        >
          {isRunning ? (
            <>
              <span className="animate-spin" style={{ display: 'inline-block' }}>⚙️</span>
              Starting...
            </>
          ) : (
            <>⚡ Run Now</>
          )}
        </button>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => setExpanded(!expanded)}
          style={{ padding: '0.5rem 0.75rem' }}
        >
          {expanded ? '✕' : '⚙️'}
        </button>
      </div>
    </div>
  );
}

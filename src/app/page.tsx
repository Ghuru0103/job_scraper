'use client';

import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import ActorCard from '@/components/ActorCard';

interface Actor {
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
}

const CATEGORIES = [
  { id: 'all', label: 'All Scrapers', icon: '🌐' },
  { id: 'job-boards', label: 'Job Boards', icon: '📋' },
  { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
  { id: 'remote', label: 'Remote', icon: '🌍' },
  { id: 'freelance', label: 'Freelance', icon: '💻' },
  { id: 'company-sites', label: 'Company Sites', icon: '🏢' },
  { id: 'aggregators', label: 'Aggregators', icon: '🔎' },
];

export default function StorePage() {
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [featured, setFeatured] = useState(false);
  const [runningActors, setRunningActors] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' }>>([]);

  const addToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };

  const fetchActors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (featured) params.set('featured', 'true');
      const res = await fetch(`/api/actors?${params}`);
      const data = await res.json();
      setActors(data.actors || []);
    } catch {
      addToast('Failed to load actors', 'error');
    } finally {
      setLoading(false);
    }
  }, [category, featured]);

  useEffect(() => { fetchActors(); }, [fetchActors]);

  const handleRun = async (actorId: string, input: Record<string, unknown>) => {
    setRunningActors((prev) => new Set(prev).add(actorId));
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actorId, input }),
      });
      if (!res.ok) throw new Error('Failed to start run');
      addToast(`✅ Run started for ${actorId}! Results appear in ~2s`, 'success');
    } catch {
      addToast('❌ Failed to start run', 'error');
    } finally {
      setTimeout(() => {
        setRunningActors((prev) => {
          const next = new Set(prev);
          next.delete(actorId);
          return next;
        });
      }, 3000);
    }
  };

  const filtered = actors.filter((a) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.description.toLowerCase().includes(q) ||
      a.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  const featuredActors = filtered.filter((a) => a.isFeatured);
  const regularActors = filtered.filter((a) => !a.isFeatured);

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navbar />

      {/* Hero */}
      <section
        className="grid-bg"
        style={{
          padding: '5rem 0 4rem',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(99,102,241,0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div className="container" style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.375rem 1rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.25)',
              fontSize: '0.8rem',
              color: '#a5b4fc',
              fontWeight: 600,
              marginBottom: '1.5rem',
            }}
          >
            <span style={{ animation: 'pulse 2s infinite', display: 'inline-block' }}>🚀</span>
            Production-Grade Web Scraping Infrastructure
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 4rem)',
              fontWeight: 900,
              lineHeight: 1.1,
              marginBottom: '1.25rem',
              letterSpacing: '-0.03em',
            }}
          >
            <span className="text-gradient">Antigravity</span>
            <br />
            <span style={{ color: 'var(--text-primary)' }}>Apify Store</span>
          </h1>

          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              maxWidth: '600px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.7,
            }}
          >
            Enterprise job scrapers with{' '}
            <span style={{ color: 'var(--accent-primary)' }}>proxy rotation</span>,{' '}
            <span style={{ color: 'var(--accent-tertiary)' }}>Redis caching</span>, and{' '}
            <span style={{ color: 'var(--accent-green)' }}>real-time monitoring</span>.
            Scrape LinkedIn, Indeed, Glassdoor, and 20+ platforms.
          </p>

          {/* Stats banner */}
          <div
            style={{
              display: 'inline-flex',
              gap: '2rem',
              padding: '1rem 2rem',
              background: 'var(--glass-bg)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-xl)',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            {[
              { value: '8+', label: 'Scrapers', icon: '🤖' },
              { value: '99.95%', label: 'Uptime', icon: '⚡' },
              { value: '<200ms', label: 'API Response', icon: '🚀' },
              { value: '50+', label: 'Proxy Pool', icon: '🌐' },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.875rem', marginBottom: '0.125rem' }}>{stat.icon}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Filters */}
      <div
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--bg-secondary)',
          position: 'sticky',
          top: '64px',
          zIndex: 40,
        }}
      >
        <div className="container" style={{ padding: '1rem 1.5rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Search */}
            <div className="input-group" style={{ flex: '1', minWidth: '200px', maxWidth: '320px' }}>
              <span className="input-icon" style={{ fontSize: '14px' }}>🔍</span>
              <input
                className="input"
                placeholder="Search scrapers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category tabs */}
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', flex: 1 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  className="btn btn-sm"
                  style={{
                    background: category === cat.id ? 'var(--gradient-primary)' : 'var(--bg-card)',
                    color: category === cat.id ? 'white' : 'var(--text-secondary)',
                    border: category === cat.id ? 'none' : '1px solid var(--border-subtle)',
                  }}
                  onClick={() => setCategory(cat.id)}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {/* Featured toggle */}
            <button
              className="btn btn-sm"
              style={{
                background: featured ? 'rgba(245,158,11,0.15)' : 'var(--bg-card)',
                color: featured ? '#fcd34d' : 'var(--text-secondary)',
                border: featured ? '1px solid rgba(245,158,11,0.3)' : '1px solid var(--border-subtle)',
              }}
              onClick={() => setFeatured(!featured)}
            >
              ⭐ Featured
            </button>
          </div>
        </div>
      </div>

      {/* Actor grid */}
      <main className="container" style={{ padding: '2.5rem 1.5rem' }}>
        {loading ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton"
                style={{ height: '340px', borderRadius: 'var(--radius-lg)' }}
              />
            ))}
          </div>
        ) : (
          <>
            {featuredActors.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>⭐</span> Featured Scrapers
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {featuredActors.map((actor) => (
                    <ActorCard
                      key={actor.actorId}
                      actor={actor}
                      onRun={handleRun}
                      isRunning={runningActors.has(actor.actorId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {regularActors.length > 0 && (
              <div>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🤖</span> All Scrapers
                  <span
                    style={{
                      padding: '0.125rem 0.5rem',
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                    }}
                  >
                    {regularActors.length}
                  </span>
                </h2>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {regularActors.map((actor) => (
                    <ActorCard
                      key={actor.actorId}
                      actor={actor}
                      onRun={handleRun}
                      isRunning={runningActors.has(actor.actorId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filtered.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '4rem',
                  color: 'var(--text-muted)',
                }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
                <h3 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                  No scrapers found
                </h3>
                <p>Try adjusting your filters or search query</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Toast notifications */}
      <div
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          zIndex: 9999,
          maxWidth: '380px',
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="animate-slide-in"
            style={{
              padding: '0.875rem 1.25rem',
              borderRadius: 'var(--radius-md)',
              background: toast.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
              border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
              color: toast.type === 'success' ? '#6ee7b7' : '#fca5a5',
              fontSize: '0.875rem',
              fontWeight: 500,
              backdropFilter: 'blur(20px)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </div>
  );
}

import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height: 100vh;">
      <main class="container" style="padding: 2rem 1.5rem;">
        <div style="margin-bottom: 1.5rem;">
          <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem;">
            🟢 System Health & Prometheus Metrics
          </h1>
          <p style="font-size: 0.875rem; color: var(--text-muted);">
            Live status of MongoDB, Redis cache, and Prometheus metric exporters.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">
              🍃 MongoDB Connection Status
            </h3>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span [style.background]="health?.mongodb === 'connected' ? 'var(--accent-green)' : '#f59e0b'" style="width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
              <span style="font-weight: 700; text-transform: uppercase;" [style.color]="health?.mongodb === 'connected' ? 'var(--accent-green)' : '#f59e0b'">
                {{ health?.mongodb || 'checking...' }}
              </span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">
              (Note: Application automatically degrades to resilient In-Memory Store if MongoDB is disconnected)
            </p>
          </div>

          <div class="card" style="padding: 1.5rem;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">
              ⚡ Redis Cache Status
            </h3>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span [style.background]="health?.redis === 'connected' ? 'var(--accent-green)' : '#f59e0b'" style="width: 10px; height: 10px; border-radius: 50%; display: inline-block;"></span>
              <span style="font-weight: 700; text-transform: uppercase;" [style.color]="health?.redis === 'connected' ? 'var(--accent-green)' : '#f59e0b'">
                {{ health?.redis || 'checking...' }}
              </span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">
              TTL query response cache & job queue manager
            </p>
          </div>
        </div>

        <div class="card" style="padding: 1.5rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
            <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
              📊 Live Prometheus Metrics Stream (/api/metrics)
            </h3>
            <a href="/api/metrics" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="text-decoration: none;">
              Open Raw Stream ↗
            </a>
          </div>
          <pre style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); font-size: 0.75rem; color: #a5b4fc; overflow: auto; max-height: 350px;">{{ rawMetrics }}</pre>
        </div>
      </main>
    </div>
  `
})
export class MonitoringComponent implements OnInit {
  health: any = null;
  rawMetrics = 'Loading metrics stream...';

  private http = inject(HttpClient);

  ngOnInit() {
    this.http.get('/api/health').subscribe({
      next: (data) => (this.health = data),
    });
    this.http.get('/api/metrics', { responseType: 'text' }).subscribe({
      next: (text) => (this.rawMetrics = text),
    });
  }
}

import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

interface Run {
  _id: string;
  actorId: string;
  actorName: string;
  status: string;
  input?: Record<string, unknown>;
  output?: { resultsCount?: number; previewResults?: unknown[] };
  stats?: { startedAt?: string; finishedAt?: string; durationMs?: number };
  createdAt: string;
}

@Component({
  selector: 'app-runs',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height: 100vh;">
      <main className="container" style="padding: 2rem 1.5rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem;">
              ⚡ Scraper Run Manager
            </h1>
            <p style="font-size: 0.875rem; color: var(--text-muted);">
              Monitor live scraping execution, view input parameters, inspect output results, or purge runs.
            </p>
          </div>
          <button className="btn btn-secondary btn-sm" (click)="fetchRuns()">🔄 Refresh</button>
        </div>

        <div *ngIf="loading" style="display: flex; flex-direction: column; gap: 1rem;">
          <div *ngFor="let i of [1,2,3]" className="skeleton" style="height: 120px; border-radius: var(--radius-lg);"></div>
        </div>

        <div *ngIf="!loading" style="display: flex; flex-direction: column; gap: 1rem;">
          <div *ngFor="let run of runs" className="card animate-fade-in" style="padding: 1.25rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
              <div>
                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.375rem;">
                  <span [className]="getStatusBadge(run.status)">{{ run.status }}</span>
                  <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                    {{ run.actorName || run.actorId }}
                  </h3>
                </div>
                <div style="font-size: 0.8rem; color: var(--text-muted);">
                  ID: {{ run._id }} &bull; Started: {{ run.createdAt | date: 'medium' }}
                </div>
              </div>

              <div style="display: flex; gap: 0.5rem; align-items: center;">
                <a [href]="'/jobs?runId=' + run._id" className="btn btn-primary btn-sm" style="text-decoration: none;">
                  💼 View Results ({{ run.output?.resultsCount || 0 }})
                </a>
                <button className="btn btn-secondary btn-sm" (click)="toggleDetails(run._id)">
                  👁 Details
                </button>
                <button className="btn btn-ghost btn-sm" (click)="deleteRun(run._id)" style="color: var(--accent-red);">
                  🗑 Delete
                </button>
              </div>
            </div>

            <!-- Details Panel -->
            <div *ngIf="expandedId === run._id" className="animate-fade-in" style="margin-top: 1rem; padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                <div>
                  <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.375rem;">
                    📥 Input Parameters
                  </div>
                  <pre style="font-size: 0.75rem; color: var(--text-primary); background: var(--bg-card); padding: 0.5rem; border-radius: 6px; overflow: auto; max-height: 150px;">{{ run.input | json }}</pre>
                </div>
                <div>
                  <div style="font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; margin-bottom: 0.375rem;">
                    📤 Output Preview
                  </div>
                  <pre style="font-size: 0.75rem; color: var(--text-primary); background: var(--bg-card); padding: 0.5rem; border-radius: 6px; overflow: auto; max-height: 150px;">{{ run.output | json }}</pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class RunsComponent implements OnInit, OnDestroy {
  runs: Run[] = [];
  loading = true;
  expandedId: string | null = null;
  intervalId: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchRuns();
    this.intervalId = setInterval(() => this.fetchRuns(), 5000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  fetchRuns() {
    this.http.get<{ runs: Run[] }>('/api/runs').subscribe({
      next: (res) => {
        this.runs = res.runs || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  getStatusBadge(status: string): string {
    if (status === 'succeeded') return 'badge badge-green';
    if (status === 'running') return 'badge badge-orange';
    if (status === 'failed') return 'badge badge-red';
    return 'badge badge-gray';
  }

  toggleDetails(id: string) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  deleteRun(id: string) {
    this.http.delete(`/api/runs/${id}`).subscribe(() => {
      this.fetchRuns();
    });
  }
}

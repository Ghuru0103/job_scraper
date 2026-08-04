import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="min-height: 100vh;">
      <main class="container" style="padding: 2rem 1.5rem;">
        <div style="margin-bottom: 1.5rem;">
          <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem;">
            📊 Scraper Analytics Dashboard
          </h1>
          <p style="font-size: 0.875rem; color: var(--text-muted);">
            Real-time execution stats, scraped job counts, active runners, and cost metrics.
          </p>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
          <div class="card" style="padding: 1.25rem; text-align: center;">
            <div style="font-size: 2rem; font-weight: 800; color: var(--accent-primary);">{{ stats?.overview?.totalRuns || 0 }}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Total Runs Triggered</div>
          </div>
          <div class="card" style="padding: 1.25rem; text-align: center;">
            <div style="font-size: 2rem; font-weight: 800; color: var(--accent-green);">{{ stats?.overview?.totalJobs || 0 }}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Total Jobs Scraped</div>
          </div>
          <div class="card" style="padding: 1.25rem; text-align: center;">
            <div style="font-size: 2rem; font-weight: 800; color: var(--accent-tertiary);">{{ stats?.overview?.activeActors || 0 }}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Active Scraper Actors</div>
          </div>
          <div class="card" style="padding: 1.25rem; text-align: center;">
            <div style="font-size: 2rem; font-weight: 800; color: #f59e0b;">\${{ stats?.overview?.totalCostUsd || '0.00' }}</div>
            <div style="font-size: 0.8rem; color: var(--text-muted);">Est. Compute Cost</div>
          </div>
        </div>

        <div class="card" style="padding: 1.5rem;">
          <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin-bottom: 1rem;">
            📈 Scraped Distribution by Job Source
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem;">
            <div *ngFor="let item of stats?.charts?.jobsBySource || []" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1rem; background: var(--bg-secondary); border-radius: var(--radius-md);">
              <span style="font-weight: 600; color: var(--text-primary);">{{ item._id }}</span>
              <span class="badge badge-purple" style="font-size: 0.85rem;">{{ item.count }} Jobs</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  stats: any = null;

  private http = inject(HttpClient);

  ngOnInit() {
    this.http.get('/api/stats').subscribe({
      next: (data) => (this.stats = data),
    });
  }
}

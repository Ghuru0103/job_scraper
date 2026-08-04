import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface Job {
  _id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  salary?: { min?: number; max?: number; currency?: string; period?: string };
  source: string;
  url: string;
  skills?: string[];
  experienceLevel?: string;
  postedAt?: string;
  scrapedAt?: string;
}

@Component({
  selector: 'app-jobs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="min-height: 100vh;">
      <main class="container" style="padding: 2rem 1.5rem;">
        <!-- Header & CSV Export Controls -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1 style="font-size: 1.75rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.25rem;">
              💼 Job Discovery Results
            </h1>
            <p style="font-size: 0.875rem; color: var(--text-muted);">
              {{ totalJobs }} jobs scraped from LinkedIn, Naukri, Indeed, and global job boards
            </p>
          </div>

          <!-- CSV Export Button with Dropdown -->
          <div style="position: relative;">
            <button class="btn btn-secondary btn-sm" (click)="toggleExportMenu()" style="font-weight: 600;">
              📥 Export CSV ▾
            </button>

            <div *ngIf="showExportMenu" class="animate-fade-in" style="position: absolute; top: calc(100% + 0.5rem); right: 0; width: 240px; background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); box-shadow: 0 10px 30px rgba(0,0,0,0.5); z-index: 100; padding: 0.5rem 0;">
              <div style="padding: 0.375rem 0.75rem; font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                Export Options
              </div>
              <button class="export-item" (click)="exportCSV('')" style="color: var(--accent-primary); font-weight: 600;">
                📦 Combined List (All Platforms)
              </button>
              <div style="height: 1px; background: var(--border-subtle); margin: 0.375rem 0;"></div>
              <div style="padding: 0.25rem 0.75rem; font-size: 0.7rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
                Platform Specific CSV
              </div>
              <button class="export-item" (click)="exportCSV('linkedin-jobs')">💼 LinkedIn Jobs CSV</button>
              <button class="export-item" (click)="exportCSV('naukri-scraper')">🇮🇳 Naukri Jobs CSV</button>
              <button class="export-item" (click)="exportCSV('indeed-scraper')">🔍 Indeed Jobs CSV</button>
              <button class="export-item" (click)="exportCSV('glassdoor-scraper')">🏢 Glassdoor Jobs CSV</button>
              <button class="export-item" (click)="exportCSV('remote-ok-scraper')">🌍 Remote OK CSV</button>
              <button class="export-item" (click)="exportCSV('upwork-scraper')">💻 Upwork Freelance CSV</button>
            </div>
          </div>
        </div>

        <!-- Filter Controls Suite -->
        <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; margin-bottom: 1.5rem; padding: 1.25rem; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-subtle); align-items: center;">
          <div class="input-group" style="flex: 1; min-width: 180px;">
            <span class="input-icon">🏢</span>
            <input class="input" placeholder="Filter company..." [(ngModel)]="searchCompany" (input)="fetchJobs()" />
          </div>

          <div class="input-group" style="flex: 1; min-width: 180px;">
            <span class="input-icon">📍</span>
            <input class="input" placeholder="Filter location..." [(ngModel)]="searchLocation" (input)="fetchJobs()" />
          </div>

          <select class="input" style="min-width: 140px;" [(ngModel)]="experienceFilter" (change)="fetchJobs()">
            <option value="">Any Experience</option>
            <option value="entry">🌱 Entry Level (0-2 yrs)</option>
            <option value="mid">🌿 Mid Level (2-5 yrs)</option>
            <option value="senior">🌳 Senior (5+ yrs)</option>
            <option value="lead">🚀 Lead / Executive</option>
          </select>

          <select class="input" style="min-width: 140px;" [(ngModel)]="minSalaryFilter" (change)="fetchJobs()">
            <option value="">Any Salary</option>
            <option value="60000">💰 $60k+ / yr</option>
            <option value="80000">💰 $80k+ / yr</option>
            <option value="100000">💰 $100k+ / yr</option>
            <option value="120000">💰 $120k+ / yr</option>
            <option value="150000">💰 $150k+ / yr</option>
          </select>

          <!-- Posted Date Select -->
          <select class="input" style="min-width: 140px;" [(ngModel)]="postedFilter" (change)="fetchJobs()">
            <option value="">Any Time</option>
            <option value="1">⏱ Last 1 day</option>
            <option value="3">⏱ Last 3 days</option>
            <option value="7">📅 Past 7 days</option>
            <option value="15">📅 Past 15 days</option>
            <option value="30">📅 Past 1 month</option>
          </select>

          <button
            class="btn btn-sm"
            [style.background]="remoteOnly ? 'rgba(16,185,129,0.15)' : 'var(--bg-elevated)'"
            [style.color]="remoteOnly ? 'var(--accent-green)' : 'var(--text-secondary)'"
            (click)="toggleRemote()"
          >
            🌍 Remote Only
          </button>

          <button *ngIf="hasActiveFilters()" class="btn btn-ghost btn-sm" (click)="clearFilters()" style="color: var(--accent-red);">
            ✕ Clear Filters
          </button>
        </div>

        <!-- Jobs Grid -->
        <div *ngIf="loading" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
          <div *ngFor="let i of [1,2,3,4,5,6]" class="skeleton" style="height: 200px; border-radius: var(--radius-lg);"></div>
        </div>

        <div *ngIf="!loading" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
          <div *ngFor="let job of jobs" class="card animate-fade-in" style="padding: 1.25rem; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <span class="badge badge-purple">{{ job.source }}</span>
                <span *ngIf="job.remote" class="badge badge-green">Remote</span>
              </div>

              <h3 style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary); margin: 0.25rem 0 0.5rem;">
                {{ job.title }}
              </h3>

              <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.25rem;">
                🏢 {{ job.company }} &bull; 📍 {{ job.location }}
              </div>

              <div *ngIf="job.salary?.max || job.salary?.min" style="font-size: 0.85rem; color: var(--accent-green); font-weight: 600; margin-bottom: 0.75rem;">
                💰 {{ (job.salary?.min || 0) | currency: job.salary?.currency || 'USD' : 'symbol' : '1.0-0' }} - {{ (job.salary?.max || 0) | currency: job.salary?.currency || 'USD' : 'symbol' : '1.0-0' }} / yr
              </div>

              <div style="display: flex; gap: 0.375rem; flex-wrap: wrap; margin-bottom: 1rem;">
                <span *ngFor="let skill of job.skills || []" class="tag">{{ skill }}</span>
              </div>
            </div>

            <a [href]="job.url" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm" style="text-align: center; text-decoration: none; display: block;">
              Apply / View Listing ↗
            </a>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .export-item {
      width: 100%;
      text-align: left;
      padding: 0.4rem 0.75rem;
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      font-size: 0.8rem;
    }
    .export-item:hover {
      background: var(--bg-card-hover);
    }
  `]
})
export class JobsComponent implements OnInit {
  jobs: Job[] = [];
  totalJobs = 0;
  loading = true;
  searchCompany = '';
  searchLocation = '';
  experienceFilter = '';
  minSalaryFilter = '';
  postedFilter = '';
  remoteOnly = false;
  showExportMenu = false;

  private http = inject(HttpClient);

  ngOnInit() {
    this.fetchJobs();
  }

  fetchJobs() {
    this.loading = true;
    const params: string[] = [];
    if (this.searchCompany) params.push(`company=${encodeURIComponent(this.searchCompany)}`);
    if (this.searchLocation) params.push(`location=${encodeURIComponent(this.searchLocation)}`);
    if (this.experienceFilter) params.push(`experienceLevel=${this.experienceFilter}`);
    if (this.minSalaryFilter) params.push(`minSalary=${this.minSalaryFilter}`);
    if (this.postedFilter) params.push(`postedWithinDays=${this.postedFilter}`);
    if (this.remoteOnly) params.push('remote=true');

    const queryString = params.length ? `?${params.join('&')}` : '';
    this.http.get<{ jobs: Job[]; pagination: { total: number } }>(`/api/jobs${queryString}`).subscribe({
      next: (res) => {
        this.jobs = res.jobs || [];
        this.totalJobs = res.pagination?.total || 0;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  toggleRemote() {
    this.remoteOnly = !this.remoteOnly;
    this.fetchJobs();
  }

  toggleExportMenu() {
    this.showExportMenu = !this.showExportMenu;
  }

  exportCSV(source?: string) {
    const params: string[] = [];
    if (source) params.push(`source=${source}`);
    if (this.searchCompany) params.push(`company=${encodeURIComponent(this.searchCompany)}`);
    if (this.searchLocation) params.push(`location=${encodeURIComponent(this.searchLocation)}`);
    if (this.experienceFilter) params.push(`experienceLevel=${this.experienceFilter}`);
    if (this.minSalaryFilter) params.push(`minSalary=${this.minSalaryFilter}`);
    if (this.postedFilter) params.push(`postedWithinDays=${this.postedFilter}`);
    if (this.remoteOnly) params.push('remote=true');

    const url = `/api/jobs/export${params.length ? '?' + params.join('&') : ''}`;
    window.open(url, '_blank');
    this.showExportMenu = false;
  }

  hasActiveFilters(): boolean {
    return !!(this.searchCompany || this.searchLocation || this.experienceFilter || this.minSalaryFilter || this.postedFilter || this.remoteOnly);
  }

  clearFilters() {
    this.searchCompany = '';
    this.searchLocation = '';
    this.experienceFilter = '';
    this.minSalaryFilter = '';
    this.postedFilter = '';
    this.remoteOnly = false;
    this.fetchJobs();
  }
}

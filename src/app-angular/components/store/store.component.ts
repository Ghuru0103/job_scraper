import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

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
  defaultInput?: Record<string, unknown>;
}

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div style="min-height: 100vh;">
      <!-- Hero -->
      <section className="grid-bg" style="padding: 4rem 0 3rem; text-align: center; position: relative;">
        <div className="container">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 1rem; border-radius: var(--radius-full); background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); font-size: 0.8rem; color: #a5b4fc; font-weight: 600; margin-bottom: 1.5rem;">
            <span>🚀</span> Angular 19 + Node.js Express Architecture
          </div>

          <h1 style="font-size: clamp(2.25rem, 5vw, 3.5rem); font-weight: 900; line-height: 1.1; margin-bottom: 1rem;">
            <span className="text-gradient">Antigravity</span>
            <br />
            <span style="color: var(--text-primary);">Apify Job Scraper Store</span>
          </h1>

          <p style="font-size: 1.1rem; color: var(--text-secondary); max-width: 600px; margin: 0 auto 2rem;">
            Scrape LinkedIn, Indeed, <strong style="color: var(--accent-green);">Naukri</strong>, Glassdoor, Remote OK, and 8+ platforms with live Redis caching, proxy rotation, and instant CSV exports.
          </p>
        </div>
      </section>

      <!-- Category Filter Bar -->
      <div style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-secondary); position: sticky; top: 64px; z-index: 40;">
        <div className="container" style="padding: 1rem 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div className="input-group" style="flex: 1; min-width: 200px; max-width: 320px;">
            <span className="input-icon">🔍</span>
            <input className="input" placeholder="Search scrapers..." [(ngModel)]="searchQuery" (input)="filterActors()" />
          </div>

          <div style="display: flex; gap: 0.375rem; flex-wrap: wrap; flex: 1;">
            <button
              *ngFor="let cat of categories"
              className="btn btn-sm"
              [style.background]="selectedCategory === cat.id ? 'var(--gradient-primary)' : 'var(--bg-card)'"
              [style.color]="selectedCategory === cat.id ? 'white' : 'var(--text-secondary)'"
              (click)="selectCategory(cat.id)"
            >
              {{ cat.icon }} {{ cat.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Scrapers Catalog Grid -->
      <main className="container" style="padding: 2.5rem 1.5rem;">
        <div *ngIf="loading" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
          <div *ngFor="let item of [1,2,3,4,5,6]" className="skeleton" style="height: 320px; border-radius: var(--radius-lg);"></div>
        </div>

        <div *ngIf="!loading" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.25rem;">
          <div *ngFor="let actor of filteredActors" className="card animate-fade-in" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
                <div style="display: flex; gap: 0.875rem; align-items: center;">
                  <div style="width: 44px; height: 44px; border-radius: 10px; background: var(--gradient-card); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                    {{ actor.icon }}
                  </div>
                  <div>
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                      {{ actor.title }}
                    </h3>
                    <span className="badge badge-purple" style="margin-top: 0.25rem;">{{ actor.category }}</span>
                  </div>
                </div>
              </div>

              <p style="font-size: 0.825rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 1rem;">
                {{ actor.description }}
              </p>

              <div style="display: flex; gap: 0.375rem; flex-wrap: wrap; margin-bottom: 1rem;">
                <span *ngFor="let tag of actor.tags.slice(0, 3)" className="tag">{{ tag }}</span>
              </div>
            </div>

            <!-- Run Form / Config Panel -->
            <div>
              <div style="padding: 0.875rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1rem;">
                <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem;">
                  ⚙️ Scraper Defaults
                </div>
                <div style="font-size: 0.8rem; color: var(--text-secondary);">
                  <div>📍 Location: <strong>Chennai, Madurai</strong></div>
                  <div>💼 Experience: <strong>2 years</strong></div>
                  <div>💻 Stack: <strong>MEAN stack, Angular, Node.js, Java</strong></div>
                </div>
              </div>

              <button
                className="btn btn-primary"
                style="width: 100%;"
                [disabled]="runningMap[actor.actorId]"
                (click)="triggerRun(actor)"
              >
                <span *ngIf="runningMap[actor.actorId]">⚙️ Starting...</span>
                <span *ngIf="!runningMap[actor.actorId]">⚡ Run Now</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  `
})
export class StoreComponent implements OnInit {
  actors: Actor[] = [];
  filteredActors: Actor[] = [];
  loading = true;
  searchQuery = '';
  selectedCategory = 'all';
  runningMap: Record<string, boolean> = {};

  categories = [
    { id: 'all', label: 'All Scrapers', icon: '🌐' },
    { id: 'job-boards', label: 'Job Boards', icon: '📋' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { id: 'remote', label: 'Remote', icon: '🌍' },
    { id: 'freelance', label: 'Freelance', icon: '💻' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.fetchActors();
  }

  fetchActors() {
    this.loading = true;
    this.http.get<{ actors: Actor[] }>('/api/actors').subscribe({
      next: (res) => {
        this.actors = res.actors || [];
        this.filterActors();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  selectCategory(catId: string) {
    this.selectedCategory = catId;
    this.filterActors();
  }

  filterActors() {
    this.filteredActors = this.actors.filter((a) => {
      const matchesCat = this.selectedCategory === 'all' || a.category === this.selectedCategory;
      const matchesQuery = !this.searchQuery ||
        a.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchesCat && matchesQuery;
    });
  }

  triggerRun(actor: Actor) {
    this.runningMap[actor.actorId] = true;
    this.http.post('/api/runs', { actorId: actor.actorId }).subscribe({
      next: () => {
        setTimeout(() => {
          this.runningMap[actor.actorId] = false;
        }, 2000);
      },
      error: () => {
        this.runningMap[actor.actorId] = false;
      }
    });
  }
}

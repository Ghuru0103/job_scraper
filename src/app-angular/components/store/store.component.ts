import { Component, OnInit, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

interface ActorInput {
  searchQuery: string;
  location: string;
  experience: string;
  maxResults: number;
}

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
      <section class="grid-bg" style="padding: 3.5rem 0 2.5rem; text-align: center; position: relative;">
        <div class="container">
          <div style="display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.375rem 1rem; border-radius: var(--radius-full); background: rgba(99,102,241,0.1); border: 1px solid rgba(99,102,241,0.25); font-size: 0.8rem; color: #a5b4fc; font-weight: 600; margin-bottom: 1.25rem;">
            <span>🕷️</span> Self-Contained Native Scraper Engine
          </div>

          <h1 style="font-size: clamp(2.25rem, 4.5vw, 3.5rem); font-weight: 900; line-height: 1.15; margin-bottom: 1rem;">
            <span class="text-gradient">GS Store</span>
          </h1>

          <p style="font-size: 1.05rem; color: var(--text-secondary); max-width: 640px; margin: 0 auto 1.5rem;">
            Scrape LinkedIn, Naukri, Indeed, Glassdoor, Remote OK, Dice, and Company Career sites directly. Customize search parameters and run real-time scrapers.
          </p>
        </div>
      </section>

      <!-- Category Filter Bar -->
      <div style="border-bottom: 1px solid var(--border-subtle); background: var(--bg-secondary); position: sticky; top: 64px; z-index: 40;">
        <div class="container" style="padding: 1rem 1.5rem; display: flex; gap: 1rem; flex-wrap: wrap; align-items: center;">
          <div class="input-group" style="flex: 1; min-width: 200px; max-width: 320px;">
            <span class="input-icon">🔍</span>
            <input class="input" placeholder="Search scrapers..." [(ngModel)]="searchQuery" (input)="filterActors()" />
          </div>

          <div style="display: flex; gap: 0.375rem; flex-wrap: wrap; flex: 1;">
            <button
              *ngFor="let cat of categories"
              class="btn btn-sm"
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
      <main class="container" style="padding: 2.5rem 1.5rem;">
        <!-- Notification Banner -->
        <div *ngIf="successMessage" style="margin-bottom: 1.5rem; padding: 1rem; border-radius: var(--radius-md); background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #34d399; font-weight: 600; display: flex; align-items: center; gap: 0.75rem; justify-content: space-between;">
          <span>✅ {{ successMessage }}</span>
          <button (click)="successMessage = ''" style="background: none; border: none; color: #34d399; cursor: pointer; font-size: 1.1rem;">✕</button>
        </div>

        <div *ngIf="loading" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem;">
          <div *ngFor="let item of [1,2,3,4,5,6]" class="skeleton" style="height: 380px; border-radius: var(--radius-lg);"></div>
        </div>

        <div *ngIf="!loading" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.25rem;">
          <div *ngFor="let actor of filteredActors" class="card animate-fade-in" style="padding: 1.5rem; display: flex; flex-direction: column; justify-content: space-between; position: relative;">
            <div>
              <!-- Header -->
              <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.875rem;">
                <div style="display: flex; gap: 0.875rem; align-items: center;">
                  <div style="width: 44px; height: 44px; border-radius: 10px; background: var(--gradient-card); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-size: 20px;">
                    {{ actor.icon }}
                  </div>
                  <div>
                    <h3 style="font-size: 1rem; font-weight: 700; color: var(--text-primary); margin: 0;">
                      {{ actor.title }}
                    </h3>
                    <span class="badge badge-purple" style="margin-top: 0.25rem;">{{ actor.category }}</span>
                  </div>
                </div>
              </div>

              <p style="font-size: 0.825rem; color: var(--text-secondary); line-height: 1.5; margin-bottom: 1rem;">
                {{ actor.description }}
              </p>

              <div style="display: flex; gap: 0.375rem; flex-wrap: wrap; margin-bottom: 1.25rem;">
                <span *ngFor="let tag of actor.tags.slice(0, 4)" class="tag">{{ tag }}</span>
              </div>
            </div>

            <!-- Editable Filter Inputs Panel -->
            <div>
              <div style="padding: 1rem; background: var(--bg-secondary); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); margin-bottom: 1rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                  <span style="font-size: 0.75rem; color: var(--accent-primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 0.375rem;">
                    ⚙️ Scraper Filter Inputs
                  </span>
                  <span style="font-size: 0.6875rem; color: var(--text-muted);">Editable</span>
                </div>

                <div *ngIf="actorInputs[actor.actorId]" style="display: flex; flex-direction: column; gap: 0.625rem;">
                  <!-- Search Query -->
                  <div>
                    <label style="font-size: 0.725rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 0.25rem;">
                      💻 Keywords / Skills:
                    </label>
                    <input
                      type="text"
                      class="input"
                      style="font-size: 0.8rem; padding: 0.4rem 0.6rem; width: 100%;"
                      [(ngModel)]="actorInputs[actor.actorId].searchQuery"
                      placeholder="e.g. MEAN stack, Angular, Node.js"
                    />
                  </div>

                  <!-- Location -->
                  <div>
                    <label style="font-size: 0.725rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 0.25rem;">
                      📍 Location:
                    </label>
                    <input
                      type="text"
                      class="input"
                      style="font-size: 0.8rem; padding: 0.4rem 0.6rem; width: 100%;"
                      [(ngModel)]="actorInputs[actor.actorId].location"
                      placeholder="e.g. Chennai, Madurai, Remote"
                    />
                  </div>

                  <!-- Experience & Max Results Row -->
                  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">
                    <div>
                      <label style="font-size: 0.725rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 0.25rem;">
                        💼 Experience:
                      </label>
                      <input
                        type="text"
                        class="input"
                        style="font-size: 0.8rem; padding: 0.4rem 0.6rem; width: 100%;"
                        [(ngModel)]="actorInputs[actor.actorId].experience"
                        placeholder="e.g. 2 years"
                      />
                    </div>

                    <div>
                      <label style="font-size: 0.725rem; color: var(--text-muted); font-weight: 600; display: block; margin-bottom: 0.25rem;">
                        🔢 Max Results:
                      </label>
                      <input
                        type="number"
                        class="input"
                        style="font-size: 0.8rem; padding: 0.4rem 0.6rem; width: 100%;"
                        [(ngModel)]="actorInputs[actor.actorId].maxResults"
                        min="1"
                        max="100"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Submit Button -->
              <button
                class="btn btn-primary"
                style="width: 100%; padding: 0.625rem; font-weight: 700;"
                [disabled]="runningMap[actor.actorId]"
                (click)="triggerRun(actor)"
              >
                <span *ngIf="runningMap[actor.actorId]">⚙️ Starting Scraper...</span>
                <span *ngIf="!runningMap[actor.actorId]">⚡ Run Scraper</span>
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
  actorInputs: Record<string, ActorInput> = {};
  successMessage = '';

  categories = [
    { id: 'all', label: 'All Scrapers', icon: '🌐' },
    { id: 'job-boards', label: 'Job Boards', icon: '📋' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼' },
    { id: 'remote', label: 'Remote', icon: '🌍' },
    { id: 'freelance', label: 'Freelance', icon: '💻' },
  ];

  private http = inject(HttpClient);

  ngOnInit() {
    this.fetchActors();
  }

  fetchActors() {
    this.loading = true;
    this.http.get<{ actors: Actor[] }>('/api/actors').subscribe({
      next: (res) => {
        this.actors = res.actors || [];
        this.initializeActorInputs();
        this.filterActors();
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }

  initializeActorInputs() {
    for (const actor of this.actors) {
      const def = actor.defaultInput || {};
      this.actorInputs[actor.actorId] = {
        searchQuery: (def['searchQuery'] as string) || 'MEAN stack, Angular, Node.js, Java',
        location: (def['location'] as string) || 'Chennai, Madurai',
        experience: (def['experience'] as string) || '2 years',
        maxResults: (def['maxResults'] as number) || 30,
      };
    }
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
    const customInput = this.actorInputs[actor.actorId] || {};

    this.http.post<{ run: any; message: string }>('/api/runs', {
      actorId: actor.actorId,
      input: customInput,
    }).subscribe({
      next: (res) => {
        this.successMessage = `Scraper "${actor.title}" started! Fetching up to ${customInput.maxResults || 30} jobs for query "${customInput.searchQuery}" in "${customInput.location}".`;
        setTimeout(() => {
          this.runningMap[actor.actorId] = false;
        }, 2000);
      },
      error: (err) => {
        this.runningMap[actor.actorId] = false;
        alert(`Failed to run scraper: ${err.error?.error || err.message}`);
      }
    });
  }
}

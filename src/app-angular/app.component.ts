import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <nav class="navbar" style="position: sticky; top: 0; z-index: 50; background: var(--glass-bg); backdrop-filter: blur(20px); border-bottom: 1px solid var(--glass-border);">
      <div class="container" style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 1.5rem; height: 68px;">
        <!-- Brand Logo -->
        <a routerLink="/" style="display: flex; align-items: center; gap: 0.875rem; text-decoration: none;">
          <img
            src="/assets/company_logo.png"
            alt="GS Store Logo"
            style="height: 40px; width: auto; object-fit: contain; border-radius: var(--radius-sm);"
            onerror="this.style.display='none'"
          />
          <div>
            <span style="font-size: 1.15rem; font-weight: 800; color: var(--text-primary); letter-spacing: -0.02em;">
              GS Store
            </span>
            <span class="badge badge-purple" style="margin-left: 0.5rem; font-size: 0.65rem; padding: 0.15rem 0.4rem;">
              Job Scraper Engine
            </span>
          </div>
        </a>

        <!-- Nav Links -->
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" class="nav-link">
            <span>🏪</span> Store
          </a>
          <a routerLink="/jobs" routerLinkActive="active" class="nav-link">
            <span>💼</span> Jobs
          </a>
          <a routerLink="/runs" routerLinkActive="active" class="nav-link">
            <span>⚡</span> Runs
          </a>
          <a routerLink="/dashboard" routerLinkActive="active" class="nav-link">
            <span>📊</span> Dashboard
          </a>
          <a routerLink="/monitoring" routerLinkActive="active" class="nav-link">
            <span>🟢</span> Monitoring
          </a>
        </div>

        <!-- System Status -->
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border-radius: var(--radius-full); background: var(--bg-card); border: 1px solid var(--border-subtle); font-size: 0.75rem;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-green); display: inline-block;"></span>
            <span style="color: var(--text-secondary); font-weight: 500;">API Ready</span>
          </div>
        </div>
      </div>
    </nav>

    <router-outlet></router-outlet>
  `,
  styles: [`
    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 0.875rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 500;
      color: var(--text-secondary);
      text-decoration: none;
      transition: all 0.2s ease;
    }
    .nav-link:hover {
      color: var(--text-primary);
      background: var(--bg-card-hover);
    }
    .nav-link.active {
      color: var(--accent-primary);
      background: rgba(99, 102, 241, 0.12);
      border: 1px solid rgba(99, 102, 241, 0.25);
      font-weight: 600;
    }
  `]
})
export class AppComponent {}

import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <nav className="navbar" style="position: sticky; top: 0; z-index: 50; background: var(--glass-bg); backdrop-filter: blur(20px); border-bottom: 1px solid var(--glass-border);">
      <div className="container" style="display: flex; align-items: center; justify-content: space-between; padding: 0.875rem 1.5rem; height: 64px;">
        <!-- Brand Logo -->
        <a routerLink="/" style="display: flex; align-items: center; gap: 0.75rem; text-decoration: none;">
          <div style="width: 36px; height: 36px; borderRadius: 10px; background: var(--gradient-primary); display: flex; align-items: center; justify-content: center; fontSize: 18px; boxShadow: var(--shadow-glow);">
            ⚗️
          </div>
          <div>
            <span style="fontSize: 1.125rem; fontWeight: 800; color: var(--text-primary); letterSpacing: -0.02em;">
              Antigravity
            </span>
            <span className="badge badge-purple" style="marginLeft: 0.5rem; fontSize: 0.65rem; padding: 0.15rem 0.4rem;">
              Apify Store
            </span>
          </div>
        </a>

        <!-- Nav Links -->
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}" className="nav-link">
            <span>🏪</span> Store
          </a>
          <a routerLink="/jobs" routerLinkActive="active" className="nav-link">
            <span>💼</span> Jobs
          </a>
          <a routerLink="/runs" routerLinkActive="active" className="nav-link">
            <span>⚡</span> Runs
          </a>
          <a routerLink="/dashboard" routerLinkActive="active" className="nav-link">
            <span>📊</span> Dashboard
          </a>
          <a routerLink="/monitoring" routerLinkActive="active" className="nav-link">
            <span>🟢</span> Monitoring
          </a>
        </div>

        <!-- System Status -->
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <div style="display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; borderRadius: var(--radius-full); background: var(--bg-card); border: 1px solid var(--border-subtle); fontSize: 0.75rem;">
            <span style="width: 8px; height: 8px; borderRadius: 50%; background: var(--accent-green); display: inline-block;"></span>
            <span style="color: var(--text-secondary); fontWeight: 500;">API Ready</span>
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

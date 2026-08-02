import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, Routes, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';

import { StoreComponent } from './components/store/store.component';
import { JobsComponent } from './components/jobs/jobs.component';
import { RunsComponent } from './components/runs/runs.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { MonitoringComponent } from './components/monitoring/monitoring.component';

export const routes: Routes = [
  { path: '', component: StoreComponent },
  { path: 'jobs', component: JobsComponent },
  { path: 'runs', component: RunsComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'monitoring', component: MonitoringComponent },
  { path: '**', redirectTo: '' },
];

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
  ],
};

import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/guards/authenticatedGuard';
import { guestGuard } from './core/guards/guestGuard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing-page/landing-page').then(m => m.LandingPage),
    canActivate: [guestGuard()],
  },
  {
    path: 'generate-itinerary',
    loadComponent: () => import('./features/home-page/home-page').then(m => m.HomePage),
    canActivate: [authenticatedGuard()],
  },
  {
    path: 'details',
    loadComponent: () => import('./features/details-page/details-page').then(m => m.DetailsPage),
    canActivate: [authenticatedGuard()]
  },
  {
    path: '**',
    loadComponent: () => import('./features/error-page/error-page').then(m => m.ErrorPage),
    redirectTo: '',
  }
];

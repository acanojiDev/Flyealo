import { Routes } from '@angular/router';
import { authenticatedGuard } from './core/guards/authenticatedGuard';
import { guestGuard } from './core/guards/guestGuard';
import { SEO_PAGES } from './features/seo-page/seo-pages';

const seoRoutes: Routes = SEO_PAGES.map((page) => ({
  path: page.path,
  loadComponent: () => import('./features/seo-page/seo-page').then(m => m.SeoPage),
  data: { seo: page },
}));

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/landing-page/landing-page').then(m => m.LandingPage),
    canActivate: [guestGuard()],
  },
  {
    path: 'legal',
    loadComponent: () => import('./features/legal-page/legal-page').then(m => m.LegalPage),
  },
  {
    path: 'privacy-policy',
    loadComponent: () => import('./features/privacy-page/privacy-page').then(m => m.PrivacyPage),
  },
  {
    path: 'terms-and-conditions',
    loadComponent: () => import('./features/terms-page/terms-page').then(m => m.TermsPage),
  },
  ...seoRoutes,
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

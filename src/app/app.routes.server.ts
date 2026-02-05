import { RenderMode, ServerRoute } from '@angular/ssr';
import { SEO_PAGES } from './features/seo-page/seo-pages';

const seoServerRoutes: ServerRoute[] = SEO_PAGES.map((page) => ({
  path: page.path,
  renderMode: RenderMode.Server,
}));

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server
  },
  ...seoServerRoutes,
  {
    path: 'generate-itinerary',
    renderMode: RenderMode.Client
  },
  {
    path: 'details',
    renderMode: RenderMode.Client
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];

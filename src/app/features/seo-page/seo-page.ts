import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Seo } from '../../core/services/seo';
import { SEO_PAGES, SeoPageContent } from './seo-pages';

type SeoUiText = {
  eyebrow: string;
  primaryCta: string;
  secondaryCta: string;
  whyTitle: string;
  howTitle: string;
  europeTitle: string;
  europeBody: string;
  steps: string[];
  relatedTitle: string;
};

const UI_EN: SeoUiText = {
  eyebrow: 'Flyealo · AI travel planning for Europe',
  primaryCta: 'Start planning',
  secondaryCta: 'How it works',
  whyTitle: 'Why Flyealo',
  howTitle: 'How it works',
  europeTitle: 'Europe-first, built in Spain',
  europeBody:
    'Flyealo is built in Spain and focused on European cities, travel rhythms, and realistic daily routes.',
  steps: ['Add your cities', 'Pick interests and pace', 'Get a day-by-day itinerary'],
  relatedTitle: 'Related pages',
};

const UI_ES: SeoUiText = {
  eyebrow: 'Flyealo · Planificacion de viajes con IA en Europa',
  primaryCta: 'Empieza ahora',
  secondaryCta: 'Como funciona',
  whyTitle: 'Por que Flyealo',
  howTitle: 'Como funciona',
  europeTitle: 'Europa primero, creado en Espana',
  europeBody:
    'Flyealo nace en Espana y esta enfocado en ciudades europeas, ritmos reales y rutas diarias.',
  steps: ['Indica tus ciudades', 'Elige intereses y ritmo', 'Recibe tu itinerario por dias'],
  relatedTitle: 'Paginas relacionadas',
};

@Component({
  selector: 'app-seo-page',
  imports: [CommonModule, RouterLink],
  templateUrl: './seo-page.html',
  styleUrl: './seo-page.scss',
})
export class SeoPage {
  private route = inject(ActivatedRoute);
  private seo = inject(Seo);

  page?: SeoPageContent;
  ui = UI_EN;
  relatedPages: SeoPageContent[] = [];

  constructor() {
    const page = this.route.snapshot.data['seo'] as SeoPageContent | undefined;
    if (!page) {
      return;
    }

    this.page = page;
    this.ui = page.lang === 'es-ES' ? UI_ES : UI_EN;
    this.relatedPages = SEO_PAGES.filter((item) => item.path !== page.path).slice(0, 6);

    this.seo.set({
      title: page.metaTitle,
      description: page.description,
      path: `/${page.path}`,
      lang: page.lang,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: page.metaTitle,
        description: page.description,
        serviceType: 'AI travel itinerary planning',
        areaServed: 'Europe',
        inLanguage: page.lang,
        url: this.seo.resolveUrl(`/${page.path}`),
        provider: {
          '@type': 'Organization',
          name: 'Flyealo',
          url: this.seo.resolveUrl('/'),
        },
      },
    });
  }
}

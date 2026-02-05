import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title, type MetaDefinition } from '@angular/platform-browser';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { environment } from '../../../environments/environment';

type SeoConfig = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  noIndex?: boolean;
  lang?: string;
  ogType?: 'website' | 'article' | 'profile';
  schema?: Record<string, unknown>;
  schemaId?: string;
};

const DEFAULT_SITE_NAME = environment.SITE_NAME || 'Flyealo';
const DEFAULT_LANG = environment.SITE_LANG || 'en-ES';
const DEFAULT_DESCRIPTION =
  environment.SITE_DESCRIPTION ||
  'Flyealo creates personalized AI travel itineraries for European trips. Plan cities, days, and interests in minutes.';

@Injectable({ providedIn: 'root' })
export class Seo {
  private meta = inject(Meta);
  private titleService = inject(Title);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  set(config: SeoConfig): void {
    const title = config.title ? `${config.title} | ${DEFAULT_SITE_NAME}` : DEFAULT_SITE_NAME;
    const description = config.description || DEFAULT_DESCRIPTION;
    const lang = config.lang || DEFAULT_LANG;
    const url = this.resolveUrl(config.path);

    this.titleService.setTitle(title);
    this.setTag('name', 'description', description);
    this.setTag(
      'name',
      'robots',
      config.noIndex
        ? 'noindex, nofollow'
        : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );

    this.setTag('property', 'og:title', title);
    this.setTag('property', 'og:description', description);
    this.setTag('property', 'og:type', config.ogType || 'website');
    this.setTag('property', 'og:site_name', DEFAULT_SITE_NAME);
    if (url) {
      this.setTag('property', 'og:url', url);
    }
    this.setTag('property', 'og:locale', lang.replace('-', '_'));

    const twitterCard = config.image ? 'summary_large_image' : 'summary';
    this.setTag('name', 'twitter:card', twitterCard);
    this.setTag('name', 'twitter:title', title);
    this.setTag('name', 'twitter:description', description);

    if (config.image) {
      this.setTag('property', 'og:image', config.image);
      this.setTag('name', 'twitter:image', config.image);
    }

    this.setCanonical(url);
    this.setLang(lang);

    if (config.schema) {
      this.setJsonLd(config.schema, config.schemaId);
    }
  }

  resolveUrl(path?: string): string {
    const origin = this.getOrigin();
    if (!path) return origin;
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    if (!origin) {
      return path.startsWith('/') ? path : `/${path}`;
    }
    return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
  }

  private setTag(attr: 'name' | 'property', key: string, content: string): void {
    if (!content) return;
    const tag: MetaDefinition = { content };
    tag[attr] = key;
    this.meta.updateTag(tag);
  }

  private setCanonical(url: string): void {
    if (!url) return;
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private setLang(lang: string): void {
    if (this.document?.documentElement) {
      this.document.documentElement.lang = lang;
    }
  }

  private setJsonLd(schema: Record<string, unknown>, id = 'seo-jsonld'): void {
    let script = this.document.getElementById(id) as HTMLScriptElement | null;
    if (!script) {
      script = this.document.createElement('script');
      script.id = id;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema);
  }

  private getOrigin(): string {
    const envUrl = environment.SITE_URL?.replace(/\/+$/, '');
    if (envUrl) return envUrl;
    if (isPlatformBrowser(this.platformId)) {
      return this.document.location?.origin ?? '';
    }
    return '';
  }
}

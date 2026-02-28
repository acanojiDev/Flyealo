import { Component, inject } from '@angular/core';
/* import { Seo } from '../../core/services/seo'; */

@Component({
  selector: 'app-error-page',
  imports: [],
  templateUrl: './error-page.html',
  styleUrl: './error-page.scss',
})
export class ErrorPage {
/*   seo = inject(Seo); */

  constructor() {
/*     this.seo.set({
      title: 'Page not found',
      description: 'The page you are looking for does not exist.',
      path: '/404',
      lang: 'en-ES',
      noIndex: true,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Page not found',
        url: this.seo.resolveUrl('/404'),
        inLanguage: 'en-ES',
      },
    }); */
  }
}

import { Component, inject } from '@angular/core';
import { ItinerarioCreado } from "./itinerario-creado/itinerario-creado";
import { RutaGenerada } from "./ruta-generada/ruta-generada";
/* import { Seo } from '../../core/services/seo'; */

@Component({
  selector: 'app-details-page',
  imports: [ItinerarioCreado, RutaGenerada],
  templateUrl: './details-page.html',
  styleUrl: './details-page.scss',
})
export class DetailsPage {
/*   seo = inject(Seo); */

  constructor() {
/*     this.seo.set({
      title: 'Your itinerary',
      description: 'Your personalized travel itinerary.',
      path: '/details',
      lang: 'en-ES',
      noIndex: true,
      schema: {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: 'Your itinerary',
        url: this.seo.resolveUrl('/details'),
        inLanguage: 'en-ES',
      },
    }); */
  }
}

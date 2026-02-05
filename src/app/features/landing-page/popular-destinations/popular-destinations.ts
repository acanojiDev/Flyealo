import { Component, inject } from '@angular/core';
import { InfoModalService } from '../../../core/services/info-modal';
import { AuthDialogService } from '../../../core/services/auth-dialog';

@Component({
  selector: 'app-popular-destinations',
  imports: [],
  templateUrl: './popular-destinations.html',
  styleUrl: './popular-destinations.scss',
})
export class PopularDestinations {
  private infoModal = inject(InfoModalService);
  private authDialogs = inject(AuthDialogService);

  destinationInfo = {
    tokyo: {
      tag: 'Tokyo',
      title: 'Tokyo, Japan',
      description: 'Neon nights, temples, and incredible food on every block.',
      items: [
        'Ideal trip length: 7-10 days',
        'Best seasons: spring and fall',
        'Metro-friendly day routes',
      ],
    },
    santorini: {
      tag: 'Santorini',
      title: 'Santorini, Greece',
      description: 'Cliffside sunsets, whitewashed villages, and caldera views.',
      items: [
        'Perfect for 3-5 days',
        'Sunset viewpoints and beach days',
        'Ferry planning tips included',
      ],
    },
    bali: {
      tag: 'Bali',
      title: 'Bali, Indonesia',
      description: 'Beaches, rice terraces, and wellness escapes in one trip.',
      items: [
        'Mix Ubud and the coast',
        'Adventure plus relaxation balance',
        'Driver and scooter options',
      ],
    },
    marrakech: {
      tag: 'Marrakech',
      title: 'Marrakech, Morocco',
      description: 'Markets, gardens, and gateway day trips to the Atlas Mountains.',
      items: [
        '3-day city base itinerary',
        'Food tours and souk highlights',
        'Desert excursions available',
      ],
    },
  };

  openDestination(key: keyof typeof this.destinationInfo, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.infoModal.open(this.destinationInfo[key]);
  }

  openRegister(event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    this.authDialogs.openRegister();
  }
}

import { Component, inject } from '@angular/core';
import { InfoModalService } from '../../../core/services/info-modal';

@Component({
  selector: 'app-itinerary-preview',
  imports: [],
  templateUrl: './itinerary-preview.html',
  styleUrl: './itinerary-preview.scss',
})
export class ItineraryPreview {
  private infoModal = inject(InfoModalService);

  infoMap = {
    budget: {
      tag: 'Budget',
      title: 'Estimated budget',
      description: 'Based on mid-range stays, local transit, and daily activities.',
      items: [
        'Adjust travel style to update the total',
        'See cost breakdown by day',
      ],
    },
    time: {
      tag: 'Time saved',
      title: 'Research saved',
      description: 'We scan reviews, hours, and transit so you do not have to.',
      items: [
        'Smart routing between stops',
        'Realistic time blocks for each day',
      ],
    },
    day1: {
      tag: 'Day 1',
      title: 'Arrival & Shibuya Exploration',
      description: 'A light arrival day with iconic neighborhoods and great food.',
      items: [
        'Airport transfer options',
        'Evening street food picks',
        'Recommended check-in window',
      ],
    },
    day2: {
      tag: 'Day 2',
      title: 'Traditional Tokyo (Asakusa & Meiji)',
      description: 'Temples, gardens, and a calm pace to start the week.',
      items: [
        'Morning shrine visits',
        'Lunch near the river',
        'Sunset stroll suggestions',
      ],
    },
    day3: {
      tag: 'Day 3',
      title: 'Modern Tokyo (Akihabara & Harajuku)',
      description: 'Technology, fashion, and nightlife in the city core.',
      items: [
        'Electronics and anime spots',
        'Street style boutiques',
        'Evening rooftop views',
      ],
    },
  };

  openInfo(key: keyof typeof this.infoMap) {
    this.infoModal.open(this.infoMap[key]);
  }
}

import { Component, inject } from '@angular/core';
import { InfoModalService } from '../../../core/services/info-modal';

@Component({
  selector: 'app-footer',
  imports: [],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private infoModal = inject(InfoModalService);

  footerInfo = {
    howItWorks: {
      tag: 'Product',
      title: 'How it works',
      description: 'A simple flow that turns ideas into travel-ready itineraries.',
      items: [
        'Share dates, budget, and interests',
        'Get a day-by-day plan in seconds',
        'Edit and export with ease',
      ],
    },
    destinations: {
      tag: 'Product',
      title: 'Destinations',
      description: 'Explore top routes built for every travel style.',
      items: [
        'Curated city guides',
        'Seasonal highlights',
        'Offline maps included',
      ],
    },
    pricing: {
      tag: 'Product',
      title: 'Pricing',
      description: 'Flexible plans that scale with your trips.',
      items: [
        'Free week plan',
        'Monthly upgrades',
        'Cancel anytime',
      ],
    },
    about: {
      tag: 'Company',
      title: 'About Flyealo',
      description: 'We build tools that make travel planning fast and joyful.',
      items: [
        'AI-powered itinerary design',
        'Trusted by travelers worldwide',
        'Based on real travel data',
      ],
    },
    careers: {
      tag: 'Company',
      title: 'Careers',
      description: 'Join a team building the future of travel planning.',
      items: [
        'Remote-friendly roles',
        'Product, design, and engineering',
        'Grow with a global team',
      ],
    },
    contact: {
      tag: 'Company',
      title: 'Contact',
      description: 'We are here to help you plan with confidence.',
      items: [
        'Support for itinerary questions',
        'Partnership inquiries',
        'Press and media requests',
      ],
    },
    privacy: {
      tag: 'Legal',
      title: 'Privacy policy',
      description: 'Your data is protected and never sold to third parties.',
      items: [
        'Clear data usage policies',
        'Secure authentication',
        'Transparency first',
      ],
    },
    terms: {
      tag: 'Legal',
      title: 'Terms of service',
      description: 'The simple rules that keep the platform safe for everyone.',
      items: [
        'User responsibilities',
        'Subscription details',
        'Cancellation guidelines',
      ],
    },
    cookies: {
      tag: 'Legal',
      title: 'Cookies',
      description: 'We use cookies to improve performance and personalization.',
      items: [
        'Analytics and performance',
        'Remembering your preferences',
        'No hidden tracking',
      ],
    },
    twitter: {
      tag: 'Social',
      title: 'Flyealo on Twitter',
      description: 'Updates, tips, and destination inspiration.',
      items: [
        'Latest product news',
        'Travel hacks and deals',
        'Community stories',
      ],
    },
    instagram: {
      tag: 'Social',
      title: 'Flyealo on Instagram',
      description: 'Beautiful itineraries and travel inspiration.',
      items: [
        'Destination highlights',
        'Behind-the-scenes planning',
        'Traveler snapshots',
      ],
    },
    linkedin: {
      tag: 'Social',
      title: 'Flyealo on LinkedIn',
      description: 'Product updates and company news.',
      items: [
        'Team announcements',
        'Partnerships',
        'Hiring updates',
      ],
    },
  };

  openFooterInfo(event: Event, key: keyof typeof this.footerInfo) {
    event.preventDefault();
    this.infoModal.open(this.footerInfo[key]);
  }
}

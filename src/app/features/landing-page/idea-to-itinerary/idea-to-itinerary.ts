import { Component, inject } from '@angular/core';
import { InfoModalService } from '../../../core/services/info-modal';
import { AuthDialogService } from '../../../core/services/auth-dialog';

@Component({
  selector: 'app-idea-to-itinerary',
  imports: [],
  templateUrl: './idea-to-itinerary.html',
  styleUrl: './idea-to-itinerary.scss',
})
export class IdeaToItinerary {
  private infoModal = inject(InfoModalService);
  private authDialogs = inject(AuthDialogService);

  stepInfo = {
    step1: {
      tag: 'Step 1',
      title: 'Tell us about your trip',
      description: 'Share destination, dates, budget, and interests for the best results.',
      items: [
        'Pick your travel style',
        'Add must-see experiences',
        'Choose pace and budget',
      ],
    },
    step2: {
      tag: 'Step 2',
      title: 'AI creates your plan',
      description: 'We analyze millions of data points to craft your day-by-day route.',
      items: [
        'Optimal routing and timing',
        'Balanced must-sees and hidden spots',
        'Smart budget estimates',
      ],
    },
    step3: {
      tag: 'Step 3',
      title: 'Review and customize',
      description: 'Swap activities, change restaurants, and tune the pace.',
      items: [
        'Drag-and-drop edits',
        'Save multiple versions',
        'Share with your group',
      ],
    },
    step4: {
      tag: 'Step 4',
      title: 'Book and travel',
      description: 'Reserve hotels and activities through trusted partners.',
      items: [
        'One-click booking links',
        'Offline access while traveling',
        'Smart reminders built in',
      ],
    },
  };

  openStep(key: keyof typeof this.stepInfo) {
    this.infoModal.open(this.stepInfo[key]);
  }

  openRegister() {
    this.authDialogs.openRegister();
  }
}

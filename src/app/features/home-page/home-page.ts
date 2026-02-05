import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { TravelFormComponent } from './travel-form-component/travel-form-component';
import { Itinerary } from '../../core/services/itinerary';
import { Travel } from '../../core/interfaces/travel';
import { Auth } from '../../core/services/auth';
@Component({
  selector: 'app-home-page',
  imports: [TravelFormComponent],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage {
  itineraryService = inject(Itinerary);
  authService = inject(Auth);
  router = inject(Router);

  user = this.authService.currentUser();
  isLoading = this.itineraryService.isLoading;
  error = this.itineraryService.error;

  welcomeName(): string {
    const name = this.user?.user_metadata?.['full_name'];
    if (!!name && (name.trim().split(/\s+/).length > 3)) {
      const words = name.trim().split(/\s+/).slice(0, 4);
      return `${words[0]} ${words[1]}\n${words[2]} ${words[3]}`;
    } else {
      return name;
    }
  }

  submitForm(event: any) {
    this.itineraryService.createItinerary(event).subscribe({
      next: (data: Travel) => {
        console.log('Itinerario creado:', data);
        this.router.navigate(['/details']);
      },
      error: (error: any) => {
        console.error('Error:', error);
      }
    });
  }
}

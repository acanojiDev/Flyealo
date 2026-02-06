import { Component, inject, signal, output, effect, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { Itinerary } from '../../../core/services/itinerary';
import { take } from 'rxjs';
import { HistoryCard } from "../history-card/history-card";
import { InfoModalService } from '../../../core/services/info-modal';
import { AuthDialogService } from '../../../core/services/auth-dialog';

@Component({
  selector: 'app-header',
  imports: [HistoryCard, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  private authService = inject(Auth);
  private itineraryService = inject(Itinerary);
  private router = inject(Router);
  private authDialogs = inject(AuthDialogService);
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  // Signals
  isMenuOpen = signal(false);
  isSidebarOpen = signal(false);
  isDarkTheme = signal(false);

  // Access to service signals
  isAuthenticated = this.authService.isAuthenticated;
  currentUser = this.authService.currentUser;
  userTravels = this.itineraryService.userTravels;
  isLoadingTravels = this.itineraryService.isLoading;

  // Outputs
  loginClick = output();
  registerClick = output();

  navInfo = {
    destinations: {
      tag: 'Destinations',
      title: 'Explore top destinations',
      description: 'AI-curated routes designed around your time, budget, and travel style.',
      items: [
        'Seasonal highlights and local gems',
        'Balanced must-sees and hidden spots',
        'Offline maps included in itineraries',
      ],
    },
    howItWorks: {
      tag: 'How it works',
      title: 'From idea to itinerary',
      description: 'Share your trip details and get a day-by-day plan in seconds.',
      items: [
        'Tell us dates, budget, and interests',
        'AI assembles a personalized schedule',
        'Edit, swap, and save anytime',
      ],
    },
    features: {
      tag: 'Features',
      title: 'Everything you need to plan smarter',
      description: 'Flyealo keeps your trip organized from the first idea to the final booking.',
      items: [
        'Personalized daily schedules',
        'Smart budget estimates',
        'Instant activity swaps',
      ],
    },
    pricing: {
      tag: 'Pricing',
      title: 'Simple, flexible plans',
      description: 'Start with a free week plan and upgrade when you are ready.',
      items: [
        'Free trial for your first week',
        'Flexible monthly subscriptions',
        'Cancel anytime',
      ],
    },
  };

  constructor() {
    if (this.isBrowser) {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        this.isDarkTheme.set(true);
        this.document.documentElement.classList.add('dark');
      }
    }
    if (this.isBrowser) {
      effect(() => {
        if (this.isMenuOpen() || this.isSidebarOpen()) {
          this.document.body.style.overflow = 'hidden';
        } else {
          this.document.body.style.overflow = 'auto';
        }
      });
    }
    effect(() => {
      const isOpen = this.isSidebarOpen() || this.isMenuOpen();
      const isAuth = this.isAuthenticated();
      const needsLoad = !this.itineraryService.travelsLoaded();

      if (isOpen && isAuth && needsLoad) {
        this.itineraryService.getAllTravels().pipe(take(1)).subscribe();
      }
    });
  }

  toggleTheme() {
    this.isDarkTheme.update(val => !val);
    if (this.isDarkTheme()) {
      this.document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      this.document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }

  toggleMenu() {
    this.isMenuOpen.update(val => !val);
  }

  closeMenu() {
    this.isMenuOpen.set(false);
  }

  toggleSidebar() {
    this.isSidebarOpen.update(val => !val);
  }

  closeSidebar() {
    this.isSidebarOpen.set(false);
  }

  closeAllMenus() {
    this.closeMenu();
    this.closeSidebar();
  }

  goToItinerary(id: string) {
    this.closeSidebar();
    this.closeMenu();
    this.itineraryService.setCurrentTravelById(id);
  }

  logout() {
    this.authService.signOut().then(() => {
      this.itineraryService.unsubscribeFromTravels();
      this.closeAllMenus();
      this.router.navigate(['/']);
    });
  }

  openLogin() {
    this.authDialogs.openLogin();
  }

  openRegister() {
    this.authDialogs.openRegister();
  }
}

import { Component, ElementRef, effect, inject, PLATFORM_ID, viewChild } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Hero } from './hero/hero';
import { ItineraryPreview } from './itinerary-preview/itinerary-preview';
import { PopularDestinations } from './popular-destinations/popular-destinations';
import { IdeaToItinerary } from './idea-to-itinerary/idea-to-itinerary';
import { Testimonials } from './testimonials/testimonials';
import { Footer } from './footer/footer';
import { LoginComponent } from './login-component/login-component';
import { RegisterComponent } from './register-component/register-component';
import { Auth } from '../../core/services/auth';
import { AuthDialogService } from '../../core/services/auth-dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [
    Hero,
    ItineraryPreview,
    PopularDestinations,
    IdeaToItinerary,
    Testimonials,
    Footer,
    LoginComponent,
    RegisterComponent,
  ],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage {
  loginDialog = viewChild<ElementRef<HTMLDialogElement>>('loginDialog');
  registerDialog = viewChild<ElementRef<HTMLDialogElement>>('registerDialog');
  authService = inject(Auth);
  authDialogs = inject(AuthDialogService);
  router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  constructor() {
    if (this.isBrowser) {
      effect(() => {
        const dialog = this.loginDialog()?.nativeElement;
        if (!dialog) {
          return;
        }

        if (this.authDialogs.isLoginOpen() && !dialog.open) {
          dialog.showModal();
        }

        if (!this.authDialogs.isLoginOpen() && dialog.open) {
          dialog.close();
        }
      });

      effect(() => {
        const dialog = this.registerDialog()?.nativeElement;
        if (!dialog) {
          return;
        }

        if (this.authDialogs.isRegisterOpen() && !dialog.open) {
          dialog.showModal();
        }

        if (!this.authDialogs.isRegisterOpen() && dialog.open) {
          dialog.close();
        }
      });
    }
  }

  async handleRegister(credentials: { email: string; password: string; username: string }) {
    try {
      const { data, error } = await this.authService.signUp(
        credentials.email,
        credentials.password,
        credentials.username,
      );

      if (error) {
        console.error('Error during sign up:', error);
        return;
      }

      if (data.user) {
        this.closeRegister();
        this.router.navigate(['/generate-itinerary']);
      }
    } catch (error: any) {
      console.error('Unexpected error during sign up:', error);
    }
  }

  async handleLogin(credentials: { email: string; password: string }) {
    const { data, error } = await this.authService.signIn(credentials.email, credentials.password);
    if (error) {
      console.error('Error during login:', error);
      return;
    }

    if (data.user) {
      this.closeLogin();
      this.router.navigate(['/generate-itinerary']);
    }
  }

  async handleGoogleSignIn() {
    this.closeLogin();
    this.closeRegister();

    const { error } = await this.authService.signInWithGoogle();
    if (error) {
      console.error('Error during Google sign in:', error);
    }
    // La redirección la maneja Supabase OAuth
  }

  openLogin() {
    this.authDialogs.openLogin();
  }

  closeLogin() {
    this.authDialogs.closeLogin();
  }

  openRegister() {
    this.authDialogs.openRegister();
  }

  closeRegister() {
    this.authDialogs.closeRegister();
  }
}

import { Component, ElementRef, inject, viewChild } from '@angular/core';
import { Hero } from './hero/hero';
import { ItineraryPreview } from './itinerary-preview/itinerary-preview';
import { PopularDestinations } from './popular-destinations/popular-destinations';
import { IdeaToItinerary } from './idea-to-itinerary/idea-to-itinerary';
import { Testimonials } from './testimonials/testimonials';
import { Footer } from './footer/footer';
import { LoginComponent } from './login-component/login-component';
import { RegisterComponent } from './register-component/register-component';
import { Auth } from '../../core/services/auth';
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
  router = inject(Router);

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
    this.loginDialog()?.nativeElement.showModal();
  }

  closeLogin() {
    this.loginDialog()?.nativeElement.close();
  }

  openRegister() {
    this.registerDialog()?.nativeElement.showModal();
  }

  closeRegister() {
    this.registerDialog()?.nativeElement.close();
  }
}

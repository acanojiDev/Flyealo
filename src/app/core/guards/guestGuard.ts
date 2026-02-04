import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth } from '../services/auth';

export const guestGuard = (): CanActivateFn => {
  return async () => {
    const auth = inject(Auth);
    const router = inject(Router);
    await auth.waitForReady();
    if (auth.isAuthenticated()) {
      return router.createUrlTree(['/generate-itinerary']);
    }
    return true;
  };
};

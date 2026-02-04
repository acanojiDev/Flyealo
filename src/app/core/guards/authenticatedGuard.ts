import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { Auth } from '../services/auth';

export const authenticatedGuard = (): CanActivateFn => {
  return async () => {
    const auth = inject(Auth);
    const router = inject(Router);

    await auth.waitForReady();
    const isAuthenticated = auth.isAuthenticated();

    if (isAuthenticated) {
      return true;
    } else {
      return router.createUrlTree(['/']);
    }
  };
};

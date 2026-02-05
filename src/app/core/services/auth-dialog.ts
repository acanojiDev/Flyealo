import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthDialogService {
  private readonly loginOpen = signal(false);
  private readonly registerOpen = signal(false);

  readonly isLoginOpen = this.loginOpen.asReadonly();
  readonly isRegisterOpen = this.registerOpen.asReadonly();

  openLogin() {
    this.loginOpen.set(true);
    this.registerOpen.set(false);
  }

  openRegister() {
    this.registerOpen.set(true);
    this.loginOpen.set(false);
  }

  closeLogin() {
    this.loginOpen.set(false);
  }

  closeRegister() {
    this.registerOpen.set(false);
  }

  closeAll() {
    this.loginOpen.set(false);
    this.registerOpen.set(false);
  }
}

import { Component, inject } from '@angular/core';
import { AuthDialogService } from '../../../core/services/auth-dialog';

@Component({
  selector: 'app-testimonials',
  imports: [],
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class Testimonials {
  private authDialogs = inject(AuthDialogService);

  openRegister() {
    this.authDialogs.openRegister();
  }
}

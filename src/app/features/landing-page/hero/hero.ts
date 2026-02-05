import { Component, inject, output } from '@angular/core';
import { Header } from "../../../shared/components/header/header";
import { AuthDialogService } from '../../../core/services/auth-dialog';

@Component({
  selector: 'app-hero',
  imports: [Header],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  private authDialogs = inject(AuthDialogService);

  loginClick = output();
  registerClick = output();

  openRegister() {
    this.authDialogs.openRegister();
  }
}

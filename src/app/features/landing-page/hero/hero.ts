import { Component, output } from '@angular/core';
import { Header } from "../../../shared/components/header/header";
import { RouterLink } from "@angular/router";

@Component({
  selector: 'app-hero',
  imports: [Header],
  templateUrl: './hero.html',
  styleUrl: './hero.scss',
})
export class Hero {
  isMenuOpen = false;

  loginClick = output();
  registerClick = output();

  toggleMenu() {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu() {
    this.isMenuOpen = false;
  }
}

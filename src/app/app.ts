import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from "./shared/components/header/header";
import { InfoModal } from "./shared/components/info-modal/info-modal";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Header, InfoModal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('flyealo');
}

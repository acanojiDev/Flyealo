import { Component, input, output } from '@angular/core';
import { Travel } from '../../../core/interfaces/travel';

@Component({
  selector: 'app-history-card',
  imports: [],
  templateUrl: './history-card.html',
  styleUrl: './history-card.scss',
})
export class HistoryCard {
  itinerary = input.required<Travel>();
  cardClick = output<string>();

  onCardClick() {
    this.cardClick.emit(this.itinerary().id);
  }
}

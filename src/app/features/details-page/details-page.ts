import { Component } from '@angular/core';
import { ItinerarioCreado } from "./itinerario-creado/itinerario-creado";
import { RutaGenerada } from "./ruta-generada/ruta-generada";

@Component({
  selector: 'app-details-page',
  imports: [ItinerarioCreado, RutaGenerada],
  templateUrl: './details-page.html',
  styleUrl: './details-page.scss',
})
export class DetailsPage {

}

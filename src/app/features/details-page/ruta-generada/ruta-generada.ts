import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, computed, inject, effect, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import mapboxgl from 'mapbox-gl';
import { Itinerary } from '../../../core/services/itinerary';
import { environment } from '../../../../environments/environment.development';
import { Router } from '@angular/router';


@Component({
  selector: 'app-ruta-generada',
  imports: [],
  templateUrl: './ruta-generada.html',
  styleUrl: './ruta-generada.scss',
})
export class RutaGenerada {
  @ViewChild('mapContainer') mapContainer!: ElementRef;
  map!: mapboxgl.Map;
  private markers: mapboxgl.Marker[] = [];
  private itineraryService = inject(Itinerary);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  itinerario = this.itineraryService.currentTravel;
  itineraryData = computed(() => this.itinerario()?.itinerary);
  selectedDay = this.itineraryService.selectedDay;

  activeDayPlaces = computed(() => {
    const data = this.itineraryData();
    const dayValue = this.selectedDay();
    if (!data?.days || !dayValue) return [];

    const activeDay = data.days.find((d: any) => d.day.toString() === dayValue.toString());
    return activeDay?.places || [];
  });

  lat: number = 0;
  lng: number = 0;
  center: [number, number] = [0, 0];

  constructor() {
    if (!this.itineraryData()) {
      this.router.navigate(['/generate-itinerary']);
    }
    if (this.isBrowser) {
      mapboxgl.accessToken = environment.MAP_KEY;
    }

    effect(() => {
      const places = this.activeDayPlaces();
      if (places && this.map) {
        if (this.map.loaded()) {
          this.updateMarkersAndRoute(places);
        } else {
          this.map.once('load', () => this.updateMarkersAndRoute(places));
        }
      }
    });
  }

  ngAfterViewInit() {
    if (!this.isBrowser) return;
    this.initializeMap();
  }

  private initializeMap() {
    const data = this.itineraryData();
    if (data?.days?.[0]?.places?.[0]?.coordinates) {
      const firstCoord = data.days[0].places[0].coordinates;
      this.center = [firstCoord.lng, firstCoord.lat];
    }
    
    this.map = new mapboxgl.Map({
      container: this.mapContainer.nativeElement,
      style: 'mapbox://styles/antoniocano21/cmkwhtxao00at01s97l554ehu',
      zoom: 17.5,
      center: this.center,
      pitch: 50, // Pitch the map for 3D view
      bearing: -17.6, // Rotate the map slightly
      antialias: true, // Create smoother edges for 3D buildings
      projection: 'globe'
    });

    this.map.on('style.load', () => {
      this.map.setFog({});
      this.map.addControl(new mapboxgl.NavigationControl());

      // Add terrain source for 3D relief
      if (!this.map.getSource('mapbox-dem')) {
        this.map.addSource('mapbox-dem', {
          'type': 'raster-dem',
          'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
          'tileSize': 512,
          'maxzoom': 14
        });
        this.map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });
      }

      // Add 3D buildings layer safely
      const style = this.map.getStyle();
      const hasCompositeSource = style.sources && style.sources['composite'];

      if (hasCompositeSource && !this.map.getLayer('add-3d-buildings')) {
        const layers = style.layers;
        let labelLayerId;
        for (let i = 0; i < layers.length; i++) {
          const layer = layers[i];
          if (layer.type === 'symbol' && layer.layout && (layer.layout as any)['text-field']) {
            labelLayerId = layer.id;
            break;
          }
        }

        this.map.addLayer(
          {
            'id': 'add-3d-buildings',
            'source': 'composite',
            'source-layer': 'building',
            'filter': ['==', 'extrude', 'true'],
            'type': 'fill-extrusion',
            'minzoom': 15,
            'paint': {
              'fill-extrusion-color': '#aaa',
              'fill-extrusion-height': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'height']
              ],
              'fill-extrusion-base': [
                'interpolate',
                ['linear'],
                ['zoom'],
                15,
                0,
                15.05,
                ['get', 'min_height']
              ],
              'fill-extrusion-opacity': 0.6
            }
          },
          labelLayerId
        );
      }

      const places = this.activeDayPlaces();
      if (places.length > 0) {
        this.updateMarkersAndRoute(places);
      }
    });
  }

  private updateMarkersAndRoute(places: any[]) {
    this.markers.forEach(marker => marker.remove());
    this.markers = [];

    const coordinates: [number, number][] = [];
    let firstCenter: [number, number] = [0,0];

    places.forEach((place: any) => {
      if (place.coordinates &&
        place.coordinates.lat !== 0 &&
        place.coordinates.lng !== 0) {
        const coord: [number, number] = [place.coordinates.lng, place.coordinates.lat];
        
        if (!firstCenter) {
          firstCenter = coord;
        }
        coordinates.push(coord);

        const marker = new mapboxgl.Marker({
          color: '#ff6b35',
          scale: 0.8
        })
          .setLngLat(coord)
          .setPopup(new mapboxgl.Popup({ offset: 25 })
            .setHTML(`
                <div style="padding: 5px; font-family: 'Outfit', sans-serif;">
                  <h4 style="margin: 0; color: #121212;">${place.name}</h4>
                  <p style="margin: 5px 0 0; color: #525252; font-size: 0.8rem;">${place.visit_time}</p>
                </div>
              `))
          .addTo(this.map);
        this.markers.push(marker);
      }
    });

    if (coordinates.length > 0) {
      this.map.flyTo({ center: coordinates[0] });
      if (this.map.getSource('route')) {
        (this.map.getSource('route') as mapboxgl.GeoJSONSource).setData({
          type: 'Feature',
          properties: {},
          geometry: {
            type: 'LineString',
            coordinates: coordinates
          }
        });
      } else {
        this.map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: coordinates
            }
          }
        });

        this.map.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round'
          },
          paint: {
            'line-color': '#00d9ff',
            'line-width': 4,
            'line-opacity': 0.8
          }
        });
      }
    }
  }
}

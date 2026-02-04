import { inject, Injectable, signal } from '@angular/core';
import { SupabaseClient, RealtimeChannel, createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';
import { Observable, from, throwError, tap, map } from 'rxjs';
import { Auth } from './auth';
import { Travel } from '../interfaces/travel';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class Itinerary {
  private auth = inject(Auth);
  private travelsChannel: RealtimeChannel | null = null;
  private http = inject(HttpClient);

  private readonly TABLE = 'travel';

  // Signals
  currentTravel = signal<Travel | null>(null);
  userTravels = signal<Travel[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);
  travelsLoaded = signal(false);
  selectedDay = signal<string>('1');

  private api = '/api';

  // Use Auth service's client
  private get client(): SupabaseClient {
    return this.auth.supabase;
  }

  /**
   * Crear itinerario
   * 1. POST a backend
   * 2. Backend responde inmediato con ID
   * 3. Escuchar cambios en BD por WebSocket
   * 4. Cuando groqStatus = 'completed', emitir resultado
   */
    createItinerary(data: Partial<Travel>): Observable<Travel> {
    const user = this.auth.currentUser();
    if (!user) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    this.isLoading.set(true);
    this.error.set(null);

    return new Observable<Travel>((observer) => {
      let channel: RealtimeChannel | null = null;

      // 1. Llamar al backend SSR
      this.http
        .post<{ id: string; status: string; message: string }>(
          `${this.api}/itineraries`,
          {
            cities: data.cities || [],
            days: data.days || 0,
            interests: data.interests || [],
            budget: data.budget || null,
            about: data.about || '',
            userId: user.id, // Backend espera userId, no userInfo
          }
        )
        .subscribe({
          next: (response) => {
            console.log('✅ Itinerario creado:', response.id);

            // 2. Crear registro temporal con status pending
            const pendingTravel: Travel = {
              id: response.id,
              userInfo: user, // Tu UserInfo object
              cities: data.cities || [],
              days: data.days || 0,
              interests: data.interests || [],
              budget: data.budget,
              about: data.about || '',
              groqStatus: 'pending',
              created_at: new Date().toISOString(),
            };

            this.currentTravel.set(pendingTravel);

            // 3. Escuchar cambios en tiempo real
            channel = this.client
              .channel(`travel-${response.id}`)
              .on(
                'postgres_changes',
                {
                  event: 'UPDATE',
                  schema: 'public',
                  table: this.TABLE,
                  filter: `id=eq.${response.id}`,
                },
                (payload) => {
                  const updatedTravel = payload.new as Travel;

                  console.log(`📡 WebSocket update - Status: ${updatedTravel.groqStatus}`);

                  // Actualizar UI constantemente
                  this.currentTravel.set(updatedTravel);

                  // Cuando está completado
                  if (updatedTravel.groqStatus === 'completed') {
                    console.log('✅ Itinerario completado');
                    this.isLoading.set(false);
                    observer.next(updatedTravel);
                    observer.complete();
                    channel?.unsubscribe();
                  }
                  // Si hay error
                  else if (updatedTravel.groqStatus === 'error') {
                    const errorMsg = updatedTravel.error_message || 'Error al generar el itinerario';
                    console.error('❌ Error:', errorMsg);
                    this.error.set(errorMsg);
                    this.isLoading.set(false);
                    observer.error(new Error(errorMsg));
                    channel?.unsubscribe();
                  }
                }
              )
              .subscribe((status) => {
                console.log('Realtime subscription status:', status);
              });
          },
          error: (err) => {
            console.error('❌ Error creando itinerario:', err);
            const errorMsg = err.error?.error || err.message || 'Error desconocido';
            this.error.set(errorMsg);
            this.isLoading.set(false);
            observer.error(new Error(errorMsg));
          },
        });

      // Cleanup al desuscribirse
      return () => {
        console.log('Limpiando subscripción');
        channel?.unsubscribe();
      };
    });
  }

  getAllTravels(): Observable<Travel[]> {
    const user = this.auth.currentUser();
    if (!user) {
      return throwError(() => new Error('Usuario no autenticado'));
    }

    if (this.travelsLoaded()) {
      return from([this.userTravels()]);
    }

    this.isLoading.set(true);

    return from(
      this.client
        .from(this.TABLE)
        .select('*')
        .eq('userInfo', user.id)
        .order('created_at', { ascending: false }),
    ).pipe(
      tap(({ data }) => {
        this.userTravels.set(data as Travel[]);
        this.travelsLoaded.set(true);
        this.isLoading.set(false);
        this.subscribeToTravels();
      }),
      map(({ data }) => data as Travel[]),
    );
  }

  subscribeToTravels() {
    const user = this.auth.currentUser();
    if (!user || this.travelsChannel) return;

    this.travelsChannel = this.client
      .channel(`user-travels-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: this.TABLE,
          filter: `userInfo=eq.${user.id}`,
        },
        (payload) => {
          const current = this.userTravels();

          if (payload.eventType === 'INSERT') {
            this.userTravels.set([payload.new as Travel, ...current]);
          }
        },
      )
      .subscribe();
  }

  unsubscribeFromTravels() {
    this.travelsChannel?.unsubscribe().then(() => {
      this.travelsChannel = null;
      this.travelsLoaded.set(false);
      this.userTravels.set([]);
    });
  }

  setCurrentTravelById(id: string) {
    this.currentTravel.set(this.userTravels().find((t) => t.id === id) || null);
  }
}

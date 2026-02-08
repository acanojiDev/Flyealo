import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment.development';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  public supabase: SupabaseClient;
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private readyResolver!: () => void;
  private readyPromise = new Promise<void>((resolve) => {
    this.readyResolver = resolve;
  });
  isReady = signal(false);
  currentUser = signal<User | null>(null);
  isAuthenticated = signal<boolean>(false);

  constructor() {
    this.supabase = createClient(environment.SUPABASE_URL, environment.SUPABASE_KEY);
    if (this.isBrowser) {
      this.checkSession().finally(() => this.markReady());

      this.supabase.auth.onAuthStateChange((event, session) => {
        if (session?.user) {
          this.currentUser.set(session.user);
          this.isAuthenticated.set(true);
        } else {
          this.currentUser.set(null);
          this.isAuthenticated.set(false);
        }
      });
    } else {
      this.markReady();
    }
  }

  async checkSession() {
    if (!this.isBrowser) return;
    try {
      const {
        data: { session },
        error,
      } = await this.supabase.auth.getSession();

      if (error) {
        console.error('Error al verificar sesión:', error);
        return;
      }

      if (session?.user) {
        this.currentUser.set(session.user);
        this.isAuthenticated.set(true);
      }
    } catch (err) {
      console.error('Error inesperado al verificar sesión:', err);
    }
  }

  async waitForReady() {
    await this.readyPromise;
  }

  private markReady() {
    if (!this.isReady()) {
      this.isReady.set(true);
      this.readyResolver();
    }
  }

  mapSupabaseAuthError(error: any): string {
    switch (error?.message) {
      case 'Invalid login credentials':
        return 'Email o contraseña incorrectos';
      case 'Email not confirmed':
        return 'Debes confirmar tu email antes de iniciar sesión';
      case 'Too many requests':
        return 'Demasiados intentos. Inténtalo más tarde';
      case 'User is banned':
        return 'Tu cuenta ha sido deshabilitada';
      case 'User already registered':
        return 'Este email ya está registrado';
      default:
        return 'Ha ocurrido un error inesperado. Inténtalo de nuevo';
    }
  }

  async signIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        return {
          data: null,
          error: {
            raw: error,
            message: this.mapSupabaseAuthError(error),
          },
        };
      }
      if (data.user) {
        this.currentUser.set(data.user);
        this.isAuthenticated.set(true);
      }
      return { data, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          raw: err,
          message: 'Error de conexión. Revisa tu internet',
        },
      };
    }
  }

  async signUp(email: string, password: string, username: string) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });
      if (error) {
        return {
          data: null,
          error: {
            raw: error,
            message: this.mapSupabaseAuthError(error),
          },
        };
      }
      if (data.user) {
        this.currentUser.set(data.user);
        this.isAuthenticated.set(true);
      }
      return { data, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          raw: err,
          message: 'Error de conexión. Revisa tu internet',
        },
      };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) {
        console.error('Error al cerrar sesión:', error);
        return { success: false, error };
      }
      this.currentUser.set(null);
      this.isAuthenticated.set(false);
      return { success: true, error: null };
    } catch (err: any) {
      console.error('Error inesperado al cerrar sesión:', err);
      return { success: false, error: err };
    }
  }

  async signInWithGoogle() {
    try {
      const { data, error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/generate-itinerary`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        return {
          data: null,
          error: {
            raw: error,
            message: this.mapSupabaseAuthError(error),
          },
        };
      }

      return { data, error: null };
    } catch (err: any) {
      return {
        data: null,
        error: {
          raw: err,
          message: 'Error al conectar con Google. Inténtalo de nuevo',
        },
      };
    }
  }
}

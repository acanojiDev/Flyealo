import { Injectable, signal } from '@angular/core';

export type InfoModalData = {
  title: string;
  subtitle?: string;
  description?: string;
  items?: string[];
  tag?: string;
};

export type InfoModalState = InfoModalData & { open: boolean };

const EMPTY_STATE: InfoModalState = {
  open: false,
  title: '',
};

@Injectable({ providedIn: 'root' })
export class InfoModalService {
  private readonly state = signal<InfoModalState>(EMPTY_STATE);
  readonly info = this.state.asReadonly();

  open(data: InfoModalData) {
    this.state.set({ ...data, open: true });
  }

  close() {
    this.state.update((current) => ({ ...current, open: false }));
  }
}

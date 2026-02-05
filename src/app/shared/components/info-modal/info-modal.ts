import {
  Component,
  ElementRef,
  effect,
  inject,
  PLATFORM_ID,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { InfoModalService } from '../../../core/services/info-modal';

@Component({
  selector: 'app-info-modal',
  standalone: true,
  imports: [],
  templateUrl: './info-modal.html',
  styleUrl: './info-modal.scss',
})
export class InfoModal {
  private infoModal = inject(InfoModalService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  dialog = viewChild<ElementRef<HTMLDialogElement>>('infoDialog');
  info = this.infoModal.info;

  constructor() {
    if (this.isBrowser) {
      effect(() => {
        const dialog = this.dialog()?.nativeElement;
        if (!dialog) {
          return;
        }

        if (this.info().open && !dialog.open) {
          dialog.showModal();
        }

        if (!this.info().open && dialog.open) {
          dialog.close();
        }
      });
    }
  }

  close() {
    this.infoModal.close();
  }

  handleCancel(event: Event) {
    event.preventDefault();
    this.close();
  }

  handleBackdropClick(event: MouseEvent) {
    const dialog = this.dialog()?.nativeElement;
    if (event.target === dialog) {
      this.close();
    }
  }

  handleDialogClose() {
    if (this.info().open) {
      this.close();
    }
  }
}

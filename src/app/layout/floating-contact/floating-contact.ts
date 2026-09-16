import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';

import { STATION, WHATSAPP_URL } from '../../station/station';

@Component({
  selector: 'app-floating-contact',
  templateUrl: './floating-contact.html',
  styleUrl: './floating-contact.scss',
  host: {
    // Escape cierra el menú: es lo que espera quien navega con teclado.
    '(document:keydown.escape)': 'close()',
  },
})
export class FloatingContact {
  private readonly router = inject(Router);

  protected readonly station = STATION;
  protected readonly whatsappUrl = WHATSAPP_URL;
  protected readonly isOpen = signal(false);

  private readonly currentPath = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.readPath()),
      startWith(this.readPath()),
    ),
    { requireSync: true },
  );

  /**
   * En la portada no aparece: ahí el botón grande de reproducir ocupa el centro
   * de la pantalla y la burbuja se le montaba encima. La portada ya tiene su
   * propia tarjeta de «Pedir por WhatsApp», así que no se pierde el acceso.
   */
  protected readonly visible = computed(() => this.currentPath() !== '/');

  protected toggle(): void {
    this.isOpen.update((open) => !open);
  }

  protected close(): void {
    this.isOpen.set(false);
  }

  private readPath(): string {
    return this.router.url.split('?')[0].split('#')[0];
  }
}

import { Component, inject } from '@angular/core';

import { STATION } from '../../station/station';
import { ToastQueue } from '../../toasts/toast-queue';

/** Siempre la portada: es donde está el reproductor. */
const SHARE_URL = `${STATION.origin}/`;

const SHARE_TEXT = `Escucha ${STATION.fullName} en vivo, la emisora de ${STATION.address.city}, ${STATION.address.region}:`;

/**
 * Botones para compartir la emisora.
 *
 * Son enlaces directos y no la hoja nativa de compartir del celular: funcionan
 * igual en cualquier navegador, incluso antes de que cargue JavaScript, y
 * WhatsApp —por donde se mueve casi todo— queda a un toque en lugar de
 * escondido en una lista de aplicaciones.
 */
@Component({
  selector: 'app-share-station',
  templateUrl: './share-station.html',
  styleUrl: './share-station.scss',
})
export class ShareStation {
  private readonly toasts = inject(ToastQueue);

  protected readonly whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `${SHARE_TEXT} ${SHARE_URL}`,
  )}`;

  protected readonly facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
    SHARE_URL,
  )}`;

  protected async copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      this.toasts.show('Enlace copiado. Pégalo donde quieras compartirlo.', 'success');
    } catch {
      // Sin permiso para el portapapeles o sin esa función en el navegador: se
      // muestra el enlace para que se pueda copiar a mano.
      this.toasts.show(`No pudimos copiar el enlace. Es este: ${SHARE_URL}`, 'error');
    }
  }
}

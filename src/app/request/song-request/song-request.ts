import { Component, computed, signal, WritableSignal } from '@angular/core';

import { whatsappLink } from '../../station/station';
import { songRequestMessage } from '../song-request-message';

/**
 * Formulario para pedir una canción.
 *
 * No envía nada por su cuenta: va armando el mensaje y el botón es un enlace a
 * WhatsApp con ese mensaje ya escrito. Por eso no hay campos obligatorios ni
 * avisos de error —el enlace sirve con lo que se haya llenado— y a la emisora
 * le llega siempre con la misma forma: la canción, para quién y de parte de
 * quién.
 */
@Component({
  selector: 'app-song-request',
  templateUrl: './song-request.html',
  styleUrl: './song-request.scss',
})
export class SongRequest {
  protected readonly song = signal('');
  protected readonly greetingFor = signal('');
  protected readonly from = signal('');

  protected readonly whatsappUrl = computed(() =>
    whatsappLink(
      songRequestMessage({
        song: this.song(),
        greetingFor: this.greetingFor(),
        from: this.from(),
      }),
    ),
  );

  protected write(field: WritableSignal<string>, event: Event): void {
    field.set((event.target as HTMLInputElement).value);
  }
}

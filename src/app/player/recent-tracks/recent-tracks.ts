import { Component, computed, inject } from '@angular/core';

import { songRequestMessage } from '../../request/song-request-message';
import { whatsappLink } from '../../station/station';
import { RadioPlayer } from '../radio-player';

/** La hora como se dice en Colombia: «10:42 a. m.». */
const CLOCK = new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' });

/**
 * Las canciones que acaban de sonar.
 *
 * Responde a la pregunta que más se le hace a una emisora —«¿cuál era la que
 * sonó ahorita?»— sin tener que escribirle, y deja a un toque pedirla otra vez.
 *
 * La lista se arma con lo que va llegando mientras la página está abierta, así
 * que al entrar está vacía y el bloque no se dibuja.
 */
@Component({
  selector: 'app-recent-tracks',
  templateUrl: './recent-tracks.html',
  styleUrl: './recent-tracks.scss',
})
export class RecentTracks {
  private readonly player = inject(RadioPlayer);

  protected readonly tracks = computed(() =>
    this.player.recentTracks().map((track) => ({
      ...track,
      time: CLOCK.format(track.startedAt),
      isoTime: new Date(track.startedAt).toISOString(),
      requestUrl: whatsappLink(songRequestMessage({ song: `${track.artist} - ${track.title}` })),
    })),
  );
}

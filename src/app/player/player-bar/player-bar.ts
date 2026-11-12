import { Component, computed, inject } from '@angular/core';

import { WhatsappIcon } from '../../icons/whatsapp-icon';
import { WHATSAPP_URL } from '../../station/station';
import { LivePlayerPresence } from '../live-player-presence';
import { RadioPlayer } from '../radio-player';

/** Donde la barra espaciadora ya tiene oficio: escribir o accionar lo que está enfocado. */
const BUSY_WITH_SPACE_BAR = 'a[href], button, input, select, textarea, summary, [contenteditable]';

/**
 * Barra fija de reproducción. Vive en la raíz de la aplicación, fuera del
 * `router-outlet`: por eso el oyente puede recorrer el sitio entero sin que la
 * emisora se corte ni un segundo.
 *
 * Lleva lo mismo en todas las pantallas —reproducir y qué suena— y cambia el
 * tercer control según lo que sirve en cada una: el volumen en las anchas, y en
 * el celular, donde el volumen ya lo dan los botones del teléfono, pedir una
 * canción.
 */
@Component({
  selector: 'app-player-bar',
  imports: [WhatsappIcon],
  templateUrl: './player-bar.html',
  styleUrl: './player-bar.scss',
  host: {
    '(document:keydown.space)': 'toggleWithSpaceBar($event)',
    '[class.is-redundant]': 'isRedundant()',
  },
})
export class PlayerBar {
  private readonly player = inject(RadioPlayer);

  protected readonly whatsappUrl = WHATSAPP_URL;

  protected readonly track = this.player.track;
  protected readonly volume = this.player.volume;
  protected readonly canSetVolume = this.player.canSetVolume;
  protected readonly isPlaying = this.player.isPlaying;
  protected readonly isBusy = this.player.isBusy;
  protected readonly hasFailed = this.player.hasFailed;
  protected readonly isMuted = this.player.isMuted;

  /**
   * Con el reproductor grande de la portada a la vista, la barra repite lo
   * mismo. Aquí solo se marca; es la hoja de estilos la que decide apartarla,
   * en todos los tamaños menos con el celular acostado, donde no hay altura para
   * que se vaya.
   */
  protected readonly isRedundant = inject(LivePlayerPresence).onScreen;

  protected readonly volumePercent = computed(() => Math.round(this.volume() * 100));

  /**
   * El stream no siempre manda título —pasa con las cuñas y los avisos—. Sin
   * él, la barra dice en qué está la emisora. Mientras no suena, nombra lo que
   * hace el botón de al lado, igual que la etiqueta del botón grande de la
   * portada: no le explica a nadie qué tocar, porque el triángulo ya lo dice.
   */
  protected readonly displayTitle = computed(() => {
    const { title } = this.track();
    if (title) return title;
    if (this.isBusy()) return 'Conectando…';
    if (this.isPlaying()) return 'En vivo · 94.1 FM';
    return 'Escuchar en vivo';
  });

  protected readonly announcement = computed(() => {
    if (this.hasFailed()) return 'No se pudo conectar con la emisora.';
    const { artist, title } = this.track();
    if (!title) return '';
    return artist ? `Sonando ahora: ${artist}, ${title}` : `Sonando ahora: ${title}`;
  });

  protected toggle(): void {
    this.player.toggle();
  }

  protected retry(): void {
    this.player.retry();
  }

  protected toggleMute(): void {
    this.player.toggleMute();
  }

  protected changeVolume(event: Event): void {
    this.player.setVolume(Number((event.target as HTMLInputElement).value));
  }

  /**
   * La barra espaciadora pausa y reanuda desde cualquier parte de la página,
   * como en cualquier reproductor. Se respeta cuando ya tiene otro oficio: al
   * escribir en un campo o al accionar el botón o el enlace que tiene el foco.
   */
  protected toggleWithSpaceBar(event: Event): void {
    const { repeat, target } = event as KeyboardEvent;
    if (repeat) return;
    if (target instanceof Element && target.closest(BUSY_WITH_SPACE_BAR)) return;

    // Sin esto, además de pausar, la página bajaría una pantalla.
    event.preventDefault();
    this.player.toggle();
  }
}

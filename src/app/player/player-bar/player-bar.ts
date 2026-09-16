import { isPlatformBrowser } from '@angular/common';
import { Component, computed, ElementRef, inject, PLATFORM_ID, signal } from '@angular/core';

import { RadioPlayer } from '../radio-player';

/**
 * Igual que en la hoja de estilos: por debajo de este ancho, el deslizador de
 * volumen se despliega en vez de estar siempre a la vista.
 */
const COMPACT_WIDTH = '(max-width: 48rem)';

/**
 * Barra fija de reproducción. Vive en la raíz de la aplicación, fuera del
 * `router-outlet`: por eso el oyente puede recorrer el sitio entero sin que la
 * emisora se corte ni un segundo.
 */
@Component({
  selector: 'app-player-bar',
  templateUrl: './player-bar.html',
  styleUrl: './player-bar.scss',
  host: {
    '(document:click)': 'collapseVolumeOnOutsideClick($event)',
  },
})
export class PlayerBar {
  private readonly player = inject(RadioPlayer);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly state = this.player.state;
  protected readonly track = this.player.track;
  protected readonly volume = this.player.volume;
  protected readonly isPlaying = this.player.isPlaying;
  protected readonly isBusy = this.player.isBusy;
  protected readonly hasFailed = this.player.hasFailed;
  protected readonly isMuted = this.player.isMuted;

  protected readonly volumePercent = computed(() => Math.round(this.volume() * 100));

  /** Mientras no llega ningún metadato, la barra invita a sintonizar. */
  protected readonly displayTitle = computed(
    () => this.track().title || 'Presiona ▶ para sintonizar la 94.1 FM',
  );

  /** La marquesina solo tiene sentido cuando hay un título de verdad. */
  protected readonly shouldScroll = computed(() => this.track().title.length > 0);

  protected readonly announcement = computed(() => {
    if (this.hasFailed()) return 'No se pudo conectar con la emisora.';
    const { artist, title } = this.track();
    if (!title) return '';
    return artist ? `Sonando ahora: ${artist}, ${title}` : `Sonando ahora: ${title}`;
  });

  private readonly isCompact = signal(false);
  protected readonly volumeExpanded = signal(false);

  protected readonly volumeButtonLabel = computed(() => {
    if (this.isCompact() && !this.volumeExpanded()) return 'Ajustar el volumen';
    return this.isMuted() ? 'Activar el sonido' : 'Silenciar';
  });

  constructor() {
    if (!this.isBrowser) return;

    const query = window.matchMedia(COMPACT_WIDTH);
    this.isCompact.set(query.matches);
    query.addEventListener('change', (event) => {
      this.isCompact.set(event.matches);
      if (!event.matches) this.volumeExpanded.set(false);
    });
  }

  protected toggle(): void {
    this.player.toggle();
  }

  protected retry(): void {
    this.player.retry();
  }

  protected changeVolume(event: Event): void {
    this.player.setVolume(Number((event.target as HTMLInputElement).value));
  }

  /**
   * En pantallas anchas el botón silencia directamente. En las estrechas, donde
   * el deslizador está plegado, el primer toque lo despliega y el segundo ya
   * silencia: así el control cabe sin robarle espacio al título de la canción.
   */
  protected onVolumeButton(): void {
    if (this.isCompact() && !this.volumeExpanded()) {
      this.volumeExpanded.set(true);
      return;
    }
    this.player.toggleMute();
  }

  protected collapseVolumeOnOutsideClick(event: MouseEvent): void {
    if (!this.volumeExpanded()) return;
    if (!this.host.nativeElement.contains(event.target as Node)) this.volumeExpanded.set(false);
  }
}

import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, OnDestroy, PLATFORM_ID, signal } from '@angular/core';

import { STATION } from '../station/station';
import { ToastQueue } from '../toasts/toast-queue';
import { parseTrack, PlayerState, StreamMetadata, Track } from './track';

const VOLUME_KEY = 'lanceros:volume';
const DEFAULT_VOLUME = 1;

/** Espera entre reintentos, en milisegundos. El último valor se repite. */
const RETRY_DELAYS = [1_000, 2_000, 4_000, 8_000, 15_000] as const;
const MAX_RETRIES = 5;

/**
 * Todo el audio de la aplicación pasa por aquí: es el único punto que toca el
 * `HTMLAudioElement` y el único que habla con el canal de metadatos.
 *
 * Tres comportamientos que en una emisora importan:
 *
 *  1. Reconecta. Si se cae la red, reintenta con espera creciente y se recupera
 *     solo en cuanto vuelve la señal, sin recargar la página.
 *  2. Suelta el buffer al pausar. Un stream en directo no se «reanuda»: si no se
 *     libera la fuente, al volver suena el audio viejo que quedó en memoria.
 *  3. Publica en MediaSession, así el celular muestra la canción y los controles
 *     en la pantalla de bloqueo.
 */
@Injectable({ providedIn: 'root' })
export class RadioPlayer implements OnDestroy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly toasts = inject(ToastQueue);

  private readonly playerState = signal<PlayerState>('stopped');
  private readonly currentTrack = signal<Track>({ artist: '', title: '' });
  private readonly currentVolume = signal(DEFAULT_VOLUME);

  readonly state = this.playerState.asReadonly();
  readonly track = this.currentTrack.asReadonly();
  readonly volume = this.currentVolume.asReadonly();

  readonly isPlaying = computed(() => this.playerState() === 'playing');
  readonly isBusy = computed(
    () => this.playerState() === 'loading' || this.playerState() === 'reconnecting',
  );
  readonly hasFailed = computed(() => this.playerState() === 'error');
  readonly isMuted = computed(() => this.currentVolume() === 0);

  private audio?: HTMLAudioElement;
  private metadataSource?: EventSource;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private metadataTimer?: ReturnType<typeof setTimeout>;
  private retryAttempt = 0;
  private metadataAttempt = 0;
  private volumeBeforeMute = DEFAULT_VOLUME;

  /** Distingue una pausa deliberada de una caída: solo se reintenta la caída. */
  private wantsToPlay = false;

  constructor() {
    if (!this.isBrowser) return;

    this.restoreVolume();
    this.connectMetadata();

    // Al volver la conexión se retoma sin que el oyente tenga que hacer nada.
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  // --- Controles ----------------------------------------------------------

  play(): void {
    if (!this.isBrowser) return;
    this.wantsToPlay = true;
    this.retryAttempt = 0;
    this.clearRetry();
    this.startPlayback();
  }

  pause(): void {
    this.wantsToPlay = false;
    this.clearRetry();
    this.releaseAudio();
    this.playerState.set('stopped');
    this.publishPlaybackState();
  }

  toggle(): void {
    if (this.playerState() === 'playing' || this.isBusy()) {
      this.pause();
    } else {
      this.play();
    }
  }

  /** Reintento manual tras un error; lo usa el botón «Reintentar». */
  retry(): void {
    this.play();
  }

  setVolume(value: number): void {
    const volume = Math.min(1, Math.max(0, value));
    this.currentVolume.set(volume);
    if (volume > 0) this.volumeBeforeMute = volume;
    if (this.audio) this.audio.volume = volume;
    this.persistVolume(volume);
  }

  toggleMute(): void {
    this.setVolume(this.currentVolume() > 0 ? 0 : this.volumeBeforeMute || DEFAULT_VOLUME);
  }

  // --- Audio --------------------------------------------------------------

  private startPlayback(): void {
    const audio = this.prepareAudio();
    this.playerState.set(this.retryAttempt > 0 ? 'reconnecting' : 'loading');

    audio.play().catch((error: unknown) => {
      // El navegador puede rechazar la reproducción automática. Eso no es una
      // caída del stream y reintentarlo solo repetiría el rechazo.
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.wantsToPlay = false;
        this.playerState.set('stopped');
        this.toasts.show('Toca el botón de reproducir para escuchar la emisora.', 'info');
        return;
      }
      this.scheduleRetry();
    });
  }

  private prepareAudio(): HTMLAudioElement {
    if (!this.audio) {
      const audio = new Audio();
      audio.preload = 'none';
      audio.volume = this.currentVolume();
      audio.addEventListener('playing', this.handlePlaying);
      audio.addEventListener('waiting', this.handleWaiting);
      audio.addEventListener('stalled', this.handleStalled);
      audio.addEventListener('error', this.handleError);
      audio.addEventListener('ended', this.handleError);
      this.audio = audio;
      this.registerMediaSessionHandlers();
    }

    // Cada intento arranca desde el directo, nunca desde lo que quedó en buffer.
    this.audio.src = STATION.stream.audio;
    this.audio.load();
    return this.audio;
  }

  private releaseAudio(): void {
    if (!this.audio) return;
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }

  private readonly handlePlaying = (): void => {
    this.retryAttempt = 0;
    this.playerState.set('playing');
    this.publishPlaybackState();
  };

  private readonly handleWaiting = (): void => {
    if (this.wantsToPlay && this.playerState() === 'playing') this.playerState.set('loading');
  };

  private readonly handleStalled = (): void => {
    if (this.wantsToPlay) this.scheduleRetry();
  };

  private readonly handleError = (): void => {
    if (!this.wantsToPlay) return;
    this.scheduleRetry();
  };

  private scheduleRetry(): void {
    this.clearRetry();

    if (this.retryAttempt >= MAX_RETRIES) {
      this.wantsToPlay = false;
      this.playerState.set('error');
      this.publishPlaybackState();
      this.toasts.show('No pudimos conectar con la emisora. Revisa tu conexión.', 'error');
      return;
    }

    const delay = RETRY_DELAYS[Math.min(this.retryAttempt, RETRY_DELAYS.length - 1)];
    this.retryAttempt += 1;
    this.playerState.set('reconnecting');
    this.retryTimer = setTimeout(() => this.startPlayback(), delay);
  }

  private clearRetry(): void {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
  }

  private readonly handleOnline = (): void => {
    if (this.playerState() === 'error' || this.playerState() === 'reconnecting') {
      this.retryAttempt = 0;
      this.play();
    }
  };

  private readonly handleOffline = (): void => {
    if (this.wantsToPlay) {
      this.toasts.show('Te quedaste sin conexión. Volveremos apenas regrese.', 'info');
    }
  };

  // --- Metadatos ----------------------------------------------------------

  private connectMetadata(): void {
    if (this.metadataSource) return;

    try {
      const source = new EventSource(STATION.stream.metadata);
      source.addEventListener('message', this.handleMetadataMessage);
      source.addEventListener('open', () => (this.metadataAttempt = 0));
      source.addEventListener('error', this.handleMetadataError);
      this.metadataSource = source;
    } catch {
      // Un navegador sin EventSource simplemente se queda sin título de canción;
      // el audio, que es lo importante, sigue funcionando.
    }
  }

  private readonly handleMetadataMessage = (event: MessageEvent<string>): void => {
    try {
      const data = JSON.parse(event.data) as StreamMetadata;
      if (data.streamTitle) {
        this.currentTrack.set(parseTrack(data.streamTitle));
        this.publishTrack();
      }
    } catch {
      // Zeno intercala mensajes de control que no son JSON. Se ignoran.
    }
  };

  private readonly handleMetadataError = (): void => {
    // EventSource reconecta solo mientras no esté cerrado; si el servidor cortó
    // de verdad, el estado queda en CLOSED y ahí sí toca reabrirlo a mano.
    if (this.metadataSource?.readyState !== EventSource.CLOSED) return;

    this.metadataSource.close();
    this.metadataSource = undefined;

    const delay = RETRY_DELAYS[Math.min(this.metadataAttempt, RETRY_DELAYS.length - 1)];
    this.metadataAttempt += 1;
    if (this.metadataTimer) clearTimeout(this.metadataTimer);
    this.metadataTimer = setTimeout(() => this.connectMetadata(), delay);
  };

  // --- MediaSession -------------------------------------------------------

  private registerMediaSessionHandlers(): void {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => this.play());
    navigator.mediaSession.setActionHandler('pause', () => this.pause());
    navigator.mediaSession.setActionHandler('stop', () => this.pause());
  }

  private publishTrack(): void {
    if (!this.isBrowser || !('mediaSession' in navigator)) return;
    const { artist, title } = this.currentTrack();
    navigator.mediaSession.metadata = new MediaMetadata({
      title: title || STATION.fullName,
      artist: artist || STATION.fullName,
      album: `${STATION.name} ${STATION.frequency}`,
      artwork: [
        { src: '/img/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' },
      ],
    });
  }

  private publishPlaybackState(): void {
    if (!this.isBrowser || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = this.isPlaying() ? 'playing' : 'paused';
  }

  // --- Volumen persistido -------------------------------------------------

  private restoreVolume(): void {
    const stored = this.readStoredVolume();
    if (stored === null) return;
    this.currentVolume.set(stored);
    if (stored > 0) this.volumeBeforeMute = stored;
  }

  private readStoredVolume(): number | null {
    try {
      const raw = localStorage.getItem(VOLUME_KEY);
      if (raw === null) return null;
      const value = Number(raw);
      return Number.isFinite(value) && value >= 0 && value <= 1 ? value : null;
    } catch {
      // Modo privado o almacenamiento bloqueado: se usa el volumen por defecto.
      return null;
    }
  }

  private persistVolume(volume: number): void {
    try {
      localStorage.setItem(VOLUME_KEY, String(volume));
    } catch {
      // Sin persistencia, pero el volumen de esta sesión funciona igual.
    }
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    this.clearRetry();
    if (this.metadataTimer) clearTimeout(this.metadataTimer);
    this.releaseAudio();
    this.metadataSource?.close();
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }
}

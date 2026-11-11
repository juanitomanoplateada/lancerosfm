import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STATION } from '../station/station';
import { ToastQueue } from '../toasts/toast-queue';
import { RadioPlayer } from './radio-player';

/**
 * Doble del elemento de audio: registra lo que el reproductor le pide y permite
 * disparar a mano los eventos del navegador.
 */
class FakeAudio {
  static instances: FakeAudio[] = [];

  src = '';
  preload = '';
  volume = 1;
  muted = false;
  readonly play = vi.fn<() => Promise<void>>(() => Promise.resolve());
  readonly pause = vi.fn();
  readonly load = vi.fn();
  readonly removeAttribute = vi.fn(() => {
    this.src = '';
  });

  private readonly listeners = new Map<string, Set<() => void>>();

  constructor() {
    FakeAudio.instances.push(this);
  }

  addEventListener(type: string, handler: () => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(handler);
  }

  removeEventListener(type: string, handler: () => void): void {
    this.listeners.get(type)?.delete(handler);
  }

  emit(type: string): void {
    for (const handler of this.listeners.get(type) ?? []) handler();
  }
}

/** Doble del canal SSE de metadatos. */
class FakeEventSource {
  static instances: FakeEventSource[] = [];
  static readonly CLOSED = 2;

  readyState = 1;
  readonly close = vi.fn(() => {
    this.readyState = FakeEventSource.CLOSED;
  });

  private readonly listeners = new Map<string, Set<(event: MessageEvent<string>) => void>>();

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this);
  }

  addEventListener(type: string, handler: (event: MessageEvent<string>) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)?.add(handler);
  }

  emitMessage(data: string): void {
    for (const handler of this.listeners.get('message') ?? []) {
      handler({ data } as MessageEvent<string>);
    }
  }

  emitOpen(): void {
    for (const handler of this.listeners.get('open') ?? []) {
      handler({} as MessageEvent<string>);
    }
  }

  emitError(): void {
    for (const handler of this.listeners.get('error') ?? []) {
      handler({} as MessageEvent<string>);
    }
  }

  /** El servidor corta de verdad: el navegador ya no reconecta solo. */
  closeFromServer(): void {
    this.readyState = FakeEventSource.CLOSED;
    this.emitError();
  }
}

/** Doble de la MediaSession del celular: guarda lo publicado y los controles. */
class FakeMediaSession {
  metadata: FakeMediaMetadata | null = null;
  playbackState = 'none';
  readonly handlers = new Map<string, () => void>();
  readonly setActionHandler = vi.fn((action: string, handler: () => void) => {
    this.handlers.set(action, handler);
  });

  press(action: string): void {
    const handler = this.handlers.get(action);
    if (!handler) throw new Error(`No hay control registrado para «${action}»`);
    handler();
  }
}

class FakeMediaMetadata {
  constructor(readonly init: MediaMetadataInit) {}
}

/**
 * jsdom no expone `localStorage` sin un origen real, así que se sustituye por un
 * doble en memoria; también sirve para simular el modo privado.
 */
function createStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => void entries.set(key, value)),
    removeItem: (key: string) => void entries.delete(key),
    clear: () => entries.clear(),
    key: (index: number) => [...entries.keys()][index] ?? null,
    get length() {
      return entries.size;
    },
  };
}

let storage: ReturnType<typeof createStorage>;

function createPlayer(): RadioPlayer {
  TestBed.configureTestingModule({});
  return TestBed.inject(RadioPlayer);
}

function lastAudio(): FakeAudio {
  const audio = FakeAudio.instances.at(-1);
  if (!audio) throw new Error('El reproductor no creó ningún elemento de audio');
  return audio;
}

function metadataChannel(index = -1): FakeEventSource {
  const source = FakeEventSource.instances.at(index);
  if (!source) throw new Error('El reproductor no abrió el canal de metadatos');
  return source;
}

/** Cinco caídas seguidas, respetando cada espera de la retirada exponencial. */
function exhaustRetries(): void {
  for (const delay of [1_000, 2_000, 4_000, 8_000, 15_000]) {
    lastAudio().emit('error');
    vi.advanceTimersByTime(delay);
  }
  lastAudio().emit('error');
}

describe('RadioPlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudio.instances = [];
    FakeEventSource.instances = [];
    vi.stubGlobal('Audio', FakeAudio);
    vi.stubGlobal('EventSource', FakeEventSource);
    storage = createStorage();
    vi.stubGlobal('localStorage', storage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  describe('reproducción', () => {
    it('arranca detenido', () => {
      expect(createPlayer().state()).toBe('stopped');
    });

    it('pasa a «playing» cuando el navegador confirma que suena', () => {
      const player = createPlayer();

      player.play();
      expect(player.state()).toBe('loading');

      lastAudio().emit('playing');
      expect(player.state()).toBe('playing');
      expect(player.isPlaying()).toBe(true);
    });

    it('apunta siempre a la URL fija del stream', () => {
      createPlayer().play();
      expect(lastAudio().src).toBe(STATION.stream.audio);
    });

    it('suelta la fuente al pausar, para no reanudar audio viejo', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');

      player.pause();

      const audio = lastAudio();
      expect(audio.pause).toHaveBeenCalled();
      expect(audio.removeAttribute).toHaveBeenCalledWith('src');
      expect(player.state()).toBe('stopped');
    });

    it('vuelve a pedir el directo al reanudar', () => {
      const player = createPlayer();
      player.play();
      player.pause();
      player.play();

      // Un solo elemento de audio reutilizado, con la fuente asignada de nuevo.
      expect(FakeAudio.instances).toHaveLength(1);
      expect(lastAudio().src).toBe(STATION.stream.audio);
    });

    it('se muestra ocupado mientras conecta o reconecta, y no cuando ya suena', () => {
      const player = createPlayer();
      expect(player.isBusy()).toBe(false);

      player.play();
      expect(player.isBusy()).toBe(true);

      lastAudio().emit('error');
      expect(player.state()).toBe('reconnecting');
      expect(player.isBusy()).toBe(true);

      lastAudio().emit('playing');
      expect(player.isBusy()).toBe(false);
    });

    it('pasa a «loading» si el audio se queda esperando datos y vuelve al sonar', () => {
      const player = createPlayer();
      player.play();

      // Mientras todavía conecta, un «waiting» no cambia nada.
      lastAudio().emit('waiting');
      expect(player.state()).toBe('loading');

      lastAudio().emit('playing');
      lastAudio().emit('waiting');
      expect(player.state()).toBe('loading');

      lastAudio().emit('playing');
      expect(player.state()).toBe('playing');
    });

    it('ignora la espera de datos después de una pausa', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');
      player.pause();

      lastAudio().emit('waiting');

      expect(player.state()).toBe('stopped');
    });
  });

  describe('botón de reproducir', () => {
    it('arranca la emisora cuando está detenida', () => {
      const player = createPlayer();

      player.toggle();

      expect(player.state()).toBe('loading');
    });

    it('la pausa cuando está sonando', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');

      player.toggle();

      expect(player.state()).toBe('stopped');
    });

    it('cancela una conexión en curso sin dejar reintentos pendientes', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('error');
      expect(player.state()).toBe('reconnecting');

      player.toggle();
      const attempts = lastAudio().play.mock.calls.length;
      vi.advanceTimersByTime(30_000);

      expect(player.state()).toBe('stopped');
      expect(lastAudio().play.mock.calls.length).toBe(attempts);
    });
  });

  describe('cuando algo falla', () => {
    it('no reintenta si el navegador bloqueó la reproducción automática', async () => {
      const player = createPlayer();
      player.play();

      const audio = lastAudio();
      audio.play.mockRejectedValueOnce(new DOMException('bloqueado', 'NotAllowedError'));

      player.play();
      await vi.advanceTimersByTimeAsync(0);

      expect(player.state()).toBe('stopped');
      expect(TestBed.inject(ToastQueue).toasts()[0].message).toContain('Toca el botón');

      // Reintentar sería inútil: el navegador volvería a rechazarlo hasta que el
      // oyente toque el botón. Nadie debe programar un nuevo intento.
      const attempts = audio.play.mock.calls.length;
      await vi.advanceTimersByTimeAsync(30_000);
      expect(audio.play.mock.calls.length).toBe(attempts);
    });

    it('trata como una caída cualquier otro rechazo al reproducir', async () => {
      const player = createPlayer();
      player.play();

      const audio = lastAudio();
      audio.play.mockRejectedValueOnce(new DOMException('sin fuente', 'NotSupportedError'));

      player.play();
      await vi.advanceTimersByTimeAsync(0);

      expect(player.state()).toBe('reconnecting');
    });

    it('reintenta con espera creciente cuando se cae la conexión', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');

      lastAudio().emit('error');
      expect(player.state()).toBe('reconnecting');

      const previousAttempts = lastAudio().play.mock.calls.length;
      vi.advanceTimersByTime(1_000);
      expect(lastAudio().play.mock.calls.length).toBe(previousAttempts + 1);
    });

    it('reintenta también cuando la transmisión se atasca', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');

      lastAudio().emit('stalled');

      expect(player.state()).toBe('reconnecting');
    });

    it('ignora un atasco que llega después de pausar', () => {
      const player = createPlayer();
      player.play();
      player.pause();

      lastAudio().emit('stalled');

      expect(player.state()).toBe('stopped');
    });

    it('se rinde con estado de error tras agotar los reintentos', () => {
      const player = createPlayer();
      player.play();

      exhaustRetries();

      expect(player.state()).toBe('error');
      expect(player.hasFailed()).toBe(true);
      expect(TestBed.inject(ToastQueue).toasts()[0].type).toBe('error');
    });

    it('vuelve a intentar desde cero cuando el oyente pulsa «Reintentar»', () => {
      const player = createPlayer();
      player.play();
      exhaustRetries();

      player.retry();

      expect(player.state()).toBe('loading');
    });

    it('ignora los eventos de error si la pausa fue deliberada', () => {
      const player = createPlayer();
      player.play();
      player.pause();

      lastAudio().emit('error');

      expect(player.state()).toBe('stopped');
    });
  });

  describe('cuando cambia la conexión del dispositivo', () => {
    it('reconecta en cuanto vuelve internet, aunque ya se hubiera rendido', () => {
      const player = createPlayer();
      player.play();
      exhaustRetries();

      globalThis.dispatchEvent(new Event('online'));

      expect(player.state()).toBe('loading');
    });

    it('no espera al siguiente reintento si internet vuelve antes', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('error');
      const attempts = lastAudio().play.mock.calls.length;

      globalThis.dispatchEvent(new Event('online'));

      expect(lastAudio().play.mock.calls.length).toBe(attempts + 1);
      expect(player.state()).toBe('loading');
    });

    it('no arranca la emisora si el oyente la tenía detenida', () => {
      const player = createPlayer();

      globalThis.dispatchEvent(new Event('online'));

      expect(player.state()).toBe('stopped');
      expect(FakeAudio.instances).toHaveLength(0);
    });

    it('avisa al oyente si se queda sin conexión mientras escucha', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');

      globalThis.dispatchEvent(new Event('offline'));

      expect(TestBed.inject(ToastQueue).toasts()[0].message).toContain('sin conexión');
    });

    it('no avisa nada si la emisora no estaba sonando', () => {
      createPlayer();

      globalThis.dispatchEvent(new Event('offline'));

      expect(TestBed.inject(ToastQueue).toasts()).toEqual([]);
    });
  });

  describe('metadatos', () => {
    it('abre el canal SSE al arrancar, sin esperar a que le den play', () => {
      createPlayer();
      expect(FakeEventSource.instances).toHaveLength(1);
      expect(metadataChannel().url).toBe(STATION.stream.metadata);
    });

    it('actualiza la canción al aire', () => {
      const player = createPlayer();

      metadataChannel().emitMessage(JSON.stringify({ streamTitle: 'Jorge Celedón - Ay hombe' }));

      expect(player.track()).toEqual({ artist: 'Jorge Celedón', title: 'Ay hombe' });
    });

    it('aguanta los mensajes que no son JSON', () => {
      const player = createPlayer();

      expect(() => metadataChannel().emitMessage('ping')).not.toThrow();
      expect(player.track().title).toBe('');
    });

    it('ignora los mensajes que no traen título', () => {
      const player = createPlayer();

      metadataChannel().emitMessage(JSON.stringify({}));

      expect(player.track()).toEqual({ artist: '', title: '' });
    });

    it('reabre el canal si el servidor lo cierra', () => {
      createPlayer();

      metadataChannel().closeFromServer();

      vi.advanceTimersByTime(1_000);
      expect(FakeEventSource.instances).toHaveLength(2);
    });

    it('espera cada vez más entre cortes seguidos y vuelve a empezar al reconectar', () => {
      createPlayer();

      metadataChannel().closeFromServer();
      vi.advanceTimersByTime(1_000);
      expect(FakeEventSource.instances).toHaveLength(2);

      // Segundo corte sin haber llegado a abrir: la espera sube a dos segundos.
      metadataChannel().closeFromServer();
      vi.advanceTimersByTime(1_000);
      expect(FakeEventSource.instances).toHaveLength(2);
      vi.advanceTimersByTime(1_000);
      expect(FakeEventSource.instances).toHaveLength(3);

      // El canal abre bien: el siguiente corte vuelve a la espera corta.
      metadataChannel().emitOpen();
      metadataChannel().closeFromServer();
      vi.advanceTimersByTime(1_000);
      expect(FakeEventSource.instances).toHaveLength(4);
    });

    it('no reabre nada mientras el canal siga reconectando por su cuenta', () => {
      createPlayer();

      metadataChannel().emitError();
      vi.advanceTimersByTime(30_000);

      expect(FakeEventSource.instances).toHaveLength(1);
    });

    it('sigue sonando en un navegador sin EventSource, solo que sin título', () => {
      vi.stubGlobal('EventSource', undefined);

      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');

      expect(player.state()).toBe('playing');
      expect(player.track().title).toBe('');
    });
  });

  describe('canciones que ya sonaron', () => {
    function announce(streamTitle: string): void {
      metadataChannel().emitMessage(JSON.stringify({ streamTitle }));
    }

    it('arranca sin ninguna: la lista se arma con lo que va sonando', () => {
      const player = createPlayer();

      announce('Jorge Celedón - Ay hombe');

      expect(player.recentTracks()).toEqual([]);
    });

    it('guarda la canción que termina, con la hora a la que empezó', () => {
      const player = createPlayer();
      vi.setSystemTime(new Date('2026-03-14T10:42:00'));
      announce('Jorge Celedón - Ay hombe');

      vi.setSystemTime(new Date('2026-03-14T10:46:00'));
      announce('Darío Gómez - Nadie es eterno');

      expect(player.recentTracks()).toEqual([
        {
          artist: 'Jorge Celedón',
          title: 'Ay hombe',
          startedAt: new Date('2026-03-14T10:42:00').getTime(),
        },
      ]);
    });

    it('pone la más reciente arriba y no pasa de cinco', () => {
      const player = createPlayer();

      for (const number of [1, 2, 3, 4, 5, 6, 7]) announce(`Artista ${number} - Canción ${number}`);

      expect(player.recentTracks().map((track) => track.title)).toEqual([
        'Canción 6',
        'Canción 5',
        'Canción 4',
        'Canción 3',
        'Canción 2',
      ]);
    });

    it('no repite la canción cuando el canal vuelve a mandar el mismo título', () => {
      const player = createPlayer();
      announce('Jorge Celedón - Ay hombe');
      announce('Jorge Celedón - Ay hombe');

      announce('Darío Gómez - Nadie es eterno');

      expect(player.recentTracks()).toHaveLength(1);
    });

    it('deja fuera las cuñas y los avisos, que no traen artista', () => {
      const player = createPlayer();
      announce('Cuña institucional');
      announce('Alcaldía de Tuta - ');

      announce('Jorge Celedón - Ay hombe');

      expect(player.recentTracks()).toEqual([]);
    });
  });

  describe('pantalla de bloqueo (MediaSession)', () => {
    let session: FakeMediaSession;

    beforeEach(() => {
      session = new FakeMediaSession();
      Object.defineProperty(navigator, 'mediaSession', { value: session, configurable: true });
      vi.stubGlobal('MediaMetadata', FakeMediaMetadata);
    });

    afterEach(() => {
      // jsdom no trae MediaSession; el doble no debe llegar a la siguiente prueba.
      Reflect.deleteProperty(navigator, 'mediaSession');
    });

    it('publica la canción al aire con la carátula de la emisora', () => {
      createPlayer();

      metadataChannel().emitMessage(
        JSON.stringify({ streamTitle: 'Darío Gómez - Nadie es eterno' }),
      );

      expect(session.metadata?.init).toEqual(
        expect.objectContaining({
          title: 'Nadie es eterno',
          artist: 'Darío Gómez',
          album: 'Lanceros Stereo 94.1 FM',
        }),
      );
      expect(session.metadata?.init.artwork).toHaveLength(2);
    });

    it('rellena con el nombre de la emisora lo que el metadato no trae', () => {
      createPlayer();

      metadataChannel().emitMessage(JSON.stringify({ streamTitle: 'Cuña institucional' }));
      expect(session.metadata?.init.artist).toBe(STATION.fullName);

      metadataChannel().emitMessage(JSON.stringify({ streamTitle: 'Alcaldía de Tuta - ' }));
      expect(session.metadata?.init.title).toBe(STATION.fullName);
    });

    it('indica si la emisora suena o está en pausa', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');
      expect(session.playbackState).toBe('playing');

      player.pause();
      expect(session.playbackState).toBe('paused');
    });

    it('obedece los controles de la pantalla de bloqueo', () => {
      const player = createPlayer();
      player.play();
      lastAudio().emit('playing');

      session.press('pause');
      expect(player.state()).toBe('stopped');

      session.press('play');
      expect(player.state()).toBe('loading');

      session.press('stop');
      expect(player.state()).toBe('stopped');
    });
  });

  describe('volumen', () => {
    it('limita el valor al rango válido', () => {
      const player = createPlayer();

      player.setVolume(2);
      expect(player.volume()).toBe(1);

      player.setVolume(-1);
      expect(player.volume()).toBe(0);
    });

    it('aplica el volumen al audio que está sonando', () => {
      const player = createPlayer();
      player.play();

      player.setVolume(0.25);

      expect(lastAudio().volume).toBe(0.25);
    });

    it('silencia y devuelve el volumen anterior', () => {
      const player = createPlayer();

      player.setVolume(0.4);
      player.toggleMute();
      expect(player.volume()).toBe(0);
      expect(player.isMuted()).toBe(true);

      player.toggleMute();
      expect(player.volume()).toBe(0.4);
    });

    it('silencia también por `muted`, que es lo único que respeta el iPhone', () => {
      const player = createPlayer();
      player.play();
      expect(lastAudio().muted).toBe(false);

      player.toggleMute();
      expect(lastAudio().muted).toBe(true);

      player.toggleMute();
      expect(lastAudio().muted).toBe(false);
    });

    it('arranca en silencio si el oyente silenció antes de darle a reproducir', () => {
      const player = createPlayer();
      player.toggleMute();

      player.play();

      expect(lastAudio().muted).toBe(true);
    });

    it('sabe que puede ajustar el volumen donde el navegador lo permite', () => {
      expect(createPlayer().canSetVolume()).toBe(true);
    });

    it('sabe que no puede donde el navegador lo ignora, como en el iPhone', () => {
      // En iOS asignar el volumen no hace nada y al leerlo siempre vale 1.
      const deafProbe = {
        get volume() {
          return 1;
        },
        set volume(_value: number) {
          // Se ignora, igual que en el teléfono.
        },
      };
      const createElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag: string) =>
        tag === 'audio' ? (deafProbe as HTMLAudioElement) : createElement(tag),
      );

      expect(createPlayer().canSetVolume()).toBe(false);

      vi.restoreAllMocks();
    });

    it('recuerda el volumen entre visitas', () => {
      createPlayer().setVolume(0.3);
      TestBed.resetTestingModule();

      expect(createPlayer().volume()).toBe(0.3);
    });

    it('no recuerda el silencio: la siguiente visita vuelve con el volumen que se oía', () => {
      const earlier = createPlayer();
      earlier.setVolume(0.6);
      earlier.toggleMute();
      TestBed.resetTestingModule();

      const player = createPlayer();

      expect(player.isMuted()).toBe(false);
      expect(player.volume()).toBe(0.6);
    });

    it('ignora el silencio que dejó guardado una versión anterior', () => {
      storage.setItem('lanceros:volume', '0');

      const player = createPlayer();

      expect(player.isMuted()).toBe(false);
      expect(player.volume()).toBe(1);
    });

    it('no vuelve casi apagada aunque se haya dejado con el deslizador al mínimo', () => {
      storage.setItem('lanceros:volume', '0.05');

      const player = createPlayer();
      expect(player.volume()).toBe(0.2);

      // Ese mismo volumen es al que regresa después de silenciar.
      player.toggleMute();
      player.toggleMute();
      expect(player.volume()).toBe(0.2);
    });

    it('descarta un volumen guardado que no tiene sentido', () => {
      storage.setItem('lanceros:volume', '7');
      expect(createPlayer().volume()).toBe(1);

      TestBed.resetTestingModule();
      storage.setItem('lanceros:volume', 'alto');
      expect(createPlayer().volume()).toBe(1);
    });

    it('usa el volumen por defecto si no puede leer el almacenamiento', () => {
      storage.getItem.mockImplementation(() => {
        throw new Error('modo privado');
      });

      expect(createPlayer().volume()).toBe(1);
    });

    it('funciona aunque el almacenamiento esté bloqueado', () => {
      storage.setItem.mockImplementation(() => {
        throw new Error('modo privado');
      });

      const player = createPlayer();
      expect(() => player.setVolume(0.5)).not.toThrow();
      expect(player.volume()).toBe(0.5);
    });
  });

  describe('durante el prerender', () => {
    it('no abre audio ni metadatos, y se destruye sin nada que soltar', () => {
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      const player = TestBed.inject(RadioPlayer);

      player.play();

      expect(player.state()).toBe('stopped');
      expect(FakeAudio.instances).toHaveLength(0);
      expect(FakeEventSource.instances).toHaveLength(0);
      expect(() => TestBed.resetTestingModule()).not.toThrow();
    });
  });
});

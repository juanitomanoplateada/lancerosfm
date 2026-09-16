import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { STATION } from '../station/station';
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

  emitError(): void {
    for (const handler of this.listeners.get('error') ?? []) {
      handler({} as MessageEvent<string>);
    }
  }
}

/**
 * jsdom no expone `localStorage` sin un origen real, así que se sustituye por un
 * doble en memoria; también sirve para simular el modo privado.
 */
function createStorage() {
  const entries = new Map<string, string>();
  return {
    getItem: (key: string) => entries.get(key) ?? null,
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

      // Reintentar sería inútil: el navegador volvería a rechazarlo hasta que el
      // oyente toque el botón. Nadie debe programar un nuevo intento.
      const attempts = audio.play.mock.calls.length;
      await vi.advanceTimersByTimeAsync(30_000);
      expect(audio.play.mock.calls.length).toBe(attempts);
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

    it('se rinde con estado de error tras agotar los reintentos', () => {
      const player = createPlayer();
      player.play();

      // Cinco caídas seguidas, respetando cada espera de la retirada exponencial.
      for (const delay of [1_000, 2_000, 4_000, 8_000, 15_000]) {
        lastAudio().emit('error');
        vi.advanceTimersByTime(delay);
      }
      lastAudio().emit('error');

      expect(player.state()).toBe('error');
      expect(player.hasFailed()).toBe(true);
    });

    it('ignora los eventos de error si la pausa fue deliberada', () => {
      const player = createPlayer();
      player.play();
      player.pause();

      lastAudio().emit('error');

      expect(player.state()).toBe('stopped');
    });
  });

  describe('metadatos', () => {
    it('abre el canal SSE al arrancar, sin esperar a que le den play', () => {
      createPlayer();
      expect(FakeEventSource.instances).toHaveLength(1);
      expect(FakeEventSource.instances[0].url).toBe(STATION.stream.metadata);
    });

    it('actualiza la canción al aire', () => {
      const player = createPlayer();

      FakeEventSource.instances[0].emitMessage(
        JSON.stringify({ streamTitle: 'Jorge Celedón - Ay hombe' }),
      );

      expect(player.track()).toEqual({ artist: 'Jorge Celedón', title: 'Ay hombe' });
    });

    it('aguanta los mensajes que no son JSON', () => {
      const player = createPlayer();

      expect(() => FakeEventSource.instances[0].emitMessage('ping')).not.toThrow();
      expect(player.track().title).toBe('');
    });

    it('reabre el canal si el servidor lo cierra', () => {
      createPlayer();

      const first = FakeEventSource.instances[0];
      first.readyState = FakeEventSource.CLOSED;
      first.emitError();

      vi.advanceTimersByTime(1_000);
      expect(FakeEventSource.instances).toHaveLength(2);
    });

    it('no reabre nada mientras el canal siga reconectando por su cuenta', () => {
      createPlayer();

      FakeEventSource.instances[0].emitError();
      vi.advanceTimersByTime(30_000);

      expect(FakeEventSource.instances).toHaveLength(1);
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

    it('silencia y devuelve el volumen anterior', () => {
      const player = createPlayer();

      player.setVolume(0.4);
      player.toggleMute();
      expect(player.volume()).toBe(0);
      expect(player.isMuted()).toBe(true);

      player.toggleMute();
      expect(player.volume()).toBe(0.4);
    });

    it('recuerda el volumen entre visitas', () => {
      createPlayer().setVolume(0.3);
      TestBed.resetTestingModule();

      expect(createPlayer().volume()).toBe(0.3);
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
});

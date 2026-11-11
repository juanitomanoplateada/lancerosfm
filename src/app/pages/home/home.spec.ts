import { computed, PLATFORM_ID, signal } from '@angular/core';
import { DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LivePlayerPresence } from '../../player/live-player-presence';
import { RadioPlayer } from '../../player/radio-player';
import { PlayedTrack, PlayerState, Track } from '../../player/track';
import { WHATSAPP_URL } from '../../station/station';
import { Home } from './home';

/** Doble del reproductor con lo que la portada lee y los controles que usa. */
class FakeRadioPlayer {
  readonly state = signal<PlayerState>('stopped');
  readonly track = signal<Track>({ artist: '', title: '' });
  readonly recentTracks = signal<readonly PlayedTrack[]>([]);
  readonly isPlaying = computed(() => this.state() === 'playing');
  readonly isBusy = computed(() => this.state() === 'loading' || this.state() === 'reconnecting');
  readonly hasFailed = computed(() => this.state() === 'error');
  readonly play = vi.fn();
  readonly toggle = vi.fn();
}

describe('Home', () => {
  let player: FakeRadioPlayer;
  let harness: RouterTestingHarness;

  function host(): HTMLElement {
    return harness.routeNativeElement!;
  }

  function tuneButton(): HTMLButtonElement {
    return host().querySelector<HTMLButtonElement>('button.tune')!;
  }

  /** Texto visible de una parte del bloque «lo que suena», sin saltos de línea. */
  function nowPlaying(part: 'label' | 'track'): string | undefined {
    return host().querySelector(`.tune__now-${part}`)?.textContent?.replace(/\s+/g, ' ').trim();
  }

  async function open(url = '/', platform = 'browser'): Promise<void> {
    TestBed.configureTestingModule({
      // La portada trae piezas de carga diferida: se declara aquí y se compila
      // antes de abrirla para que TestBed las tenga resueltas.
      imports: [Home],
      providers: [
        provideRouter([{ path: '', component: Home }]),
        { provide: RadioPlayer, useValue: player },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    await TestBed.compileComponents();
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Home);
  }

  async function settle(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
  }

  /** Trae las piezas de carga diferida, como hace el navegador en cuanto queda libre. */
  async function loadDeferred(): Promise<void> {
    for (const block of await harness.fixture.getDeferBlocks()) {
      await block.render(DeferBlockState.Complete);
    }
  }

  beforeEach(() => {
    player = new FakeRadioPlayer();
  });

  it('publica el título de la portada sin repetir el nombre de la emisora', async () => {
    await open();

    expect(document.title).toBe('Lanceros Stereo 94.1 FM en vivo — Emisora de Tuta, Boyacá');
  });

  it('pone el reproductor como encabezado principal de la página', async () => {
    await open();

    expect(host().querySelector('h1')?.textContent).toContain('Lanceros Stereo 94.1 FM en vivo');
  });

  describe('botón grande', () => {
    it('invita a escuchar y pasa el toque al reproductor', async () => {
      await open();
      expect(tuneButton().getAttribute('aria-label')).toBe('Escuchar la emisora en vivo');
      expect(tuneButton().textContent).toContain('Escuchar en vivo');

      tuneButton().click();

      expect(player.toggle).toHaveBeenCalledTimes(1);
    });

    it('avisa mientras conecta', async () => {
      await open();

      player.state.set('loading');
      await settle();

      expect(tuneButton().textContent).toContain('Conectando…');
    });

    it('ofrece pausar mientras suena', async () => {
      await open();

      player.state.set('playing');
      await settle();

      expect(tuneButton().getAttribute('aria-label')).toBe('Pausar la emisora');
      expect(tuneButton().textContent).toContain('Pausar');
    });
  });

  describe('lo que suena', () => {
    it('recuerda que la emisora transmite todo el día mientras no hay título', async () => {
      await open();

      expect(nowPlaying('label')).toBeUndefined();
      expect(nowPlaying('track')).toBe('Transmitimos las 24 horas, todos los días.');
    });

    it('muestra artista y canción', async () => {
      await open();

      player.track.set({ artist: 'Los Hispanos', title: 'Boquita de caramelo' });
      await settle();

      expect(nowPlaying('label')).toBe('Ahora en la 94.1');
      expect(nowPlaying('track')).toBe('Los Hispanos · Boquita de caramelo');
    });

    it('dice «Sonando ahora» cuando el oyente la está escuchando', async () => {
      await open();

      player.state.set('playing');
      player.track.set({ artist: '', title: 'Cuña institucional' });
      await settle();

      expect(nowPlaying('label')).toBe('Sonando ahora');
      expect(nowPlaying('track')).toBe('Cuña institucional');
    });

    it('pone el artista y la canción cada uno en su renglón', async () => {
      await open();

      player.track.set({ artist: 'Los Hispanos', title: 'Boquita de caramelo' });
      await settle();

      expect(host().querySelector('.tune__now-artist')?.textContent).toBe('Los Hispanos');
      expect(host().querySelector('.tune__now-title')?.textContent).toBe('Boquita de caramelo');
    });

    it('deja solo el título cuando lo que suena no trae artista', async () => {
      await open();

      player.track.set({ artist: '', title: 'Cuña institucional' });
      await settle();

      expect(host().querySelector('.tune__now-artist')).toBeNull();
      expect(host().querySelector('.tune__now-title')?.textContent).toBe('Cuña institucional');
    });

    it('mueve el ecualizador solo mientras suena', async () => {
      await open();
      player.track.set({ artist: 'Los Hispanos', title: 'Boquita de caramelo' });
      await settle();
      const equalizer = () => host().querySelector('.tune__eq')!;
      expect(equalizer().getAttribute('aria-hidden')).toBe('true');
      expect(equalizer().classList).not.toContain('is-playing');

      player.state.set('playing');
      await settle();
      expect(equalizer().classList).toContain('is-playing');
    });

    it('explica qué hacer si no hay conexión', async () => {
      await open();

      player.state.set('error');
      await settle();

      expect(nowPlaying('label')).toBe('Sin conexión con la emisora');
      expect(nowPlaying('track')).toBe('Revisa tu internet y vuelve a intentarlo.');
    });
  });

  it('lleva a pedir canciones por WhatsApp con el mensaje ya escrito', async () => {
    await open();

    const request = host().querySelector<HTMLAnchorElement>('.live-player__request')!;
    expect(request.href).toBe(WHATSAPP_URL);
    expect(request.textContent).toContain('Pedir una canción');
  });

  describe('primera pantalla', () => {
    it('deja el título para los buscadores y los lectores de pantalla, sin mostrarlo', async () => {
      await open();

      const title = host().querySelector('h1')!;
      expect(title.textContent).toBe('Lanceros Stereo 94.1 FM en vivo');
      expect(title.classList).toContain('visually-hidden');
    });

    it('muestra solo reproducir, qué suena y pedir una canción', async () => {
      await open();

      const screen = host().querySelector<HTMLElement>('.live-player__layout')!;
      const visible = [...screen.children]
        .filter((child) => !child.classList.contains('visually-hidden'))
        .map((child) => child.className.split(' ')[0]);

      expect(visible).toEqual(['tune', 'tune__now', 'btn']);
    });

    it('pone la lista de lo que ya sonó fuera de ella, debajo', async () => {
      await open();
      player.recentTracks.set([{ artist: 'Jorge Celedón', title: 'Ay hombe', startedAt: 0 }]);
      await settle();

      const list = host().querySelector('app-recent-tracks')!;
      expect(host().querySelector('.live-player')?.contains(list)).toBe(false);
    });
  });

  describe('junto al reproductor', () => {
    it('no pide la lista de canciones hasta que termina la primera', async () => {
      await open();
      expect(host().querySelector('app-recent-tracks')).toBeNull();

      player.recentTracks.set([{ artist: 'Jorge Celedón', title: 'Ay hombe', startedAt: 0 }]);
      await settle();

      expect(host().querySelector('.recent__item')?.textContent).toContain('Ay hombe');
    });
  });

  describe('tarjeta «Pide tu canción»', () => {
    function card(): HTMLElement {
      return host().querySelector<HTMLElement>('.on-air__request')!;
    }

    it('ofrece el enlace directo a WhatsApp mientras llega el formulario', async () => {
      await open();

      expect(card().querySelector('h3')?.textContent).toBe('Pide tu canción');
      expect(card().querySelector<HTMLAnchorElement>('a.btn--whatsapp')?.href).toBe(WHATSAPP_URL);
      expect(card().querySelector('input')).toBeNull();
    });

    it('trae el formulario para pedir una canción con su saludo', async () => {
      await open();
      await loadDeferred();

      expect(card().querySelectorAll('app-song-request input')).toHaveLength(3);
    });
  });

  describe('atajo «Escuchar en vivo» de la aplicación instalada', () => {
    it('arranca la emisora al abrir /?play=1', async () => {
      await open('/?play=1');

      expect(player.play).toHaveBeenCalledTimes(1);
    });

    it('no arranca nada en una visita normal', async () => {
      await open('/');

      expect(player.play).not.toHaveBeenCalled();
    });

    it('no intenta reproducir durante el prerender', async () => {
      await open('/?play=1', 'server');

      expect(player.play).not.toHaveBeenCalled();
    });
  });

  describe('barra fija', () => {
    /** El observador mínimo para saber qué elemento se queda vigilando la portada. */
    class WatchedElements {
      static readonly all: Element[] = [];

      observe(element: Element): void {
        WatchedElements.all.push(element);
      }

      disconnect(): void {
        WatchedElements.all.length = 0;
      }
    }

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('le avisa de que el botón grande está a la vista, para que se aparte', async () => {
      vi.stubGlobal('IntersectionObserver', WatchedElements);

      await open();

      expect(TestBed.inject(LivePlayerPresence).onScreen()).toBe(true);
      expect(WatchedElements.all).toEqual([tuneButton()]);
    });
  });
});

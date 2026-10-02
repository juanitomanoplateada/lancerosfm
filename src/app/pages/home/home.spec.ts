import { computed, PLATFORM_ID, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RadioPlayer } from '../../player/radio-player';
import { PlayerState, Track } from '../../player/track';
import { WHATSAPP_URL } from '../../station/station';
import { Home } from './home';

/** Doble del reproductor con lo que la portada lee y los controles que usa. */
class FakeRadioPlayer {
  readonly state = signal<PlayerState>('stopped');
  readonly track = signal<Track>({ artist: '', title: '' });
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
      providers: [
        provideRouter([{ path: '', component: Home }]),
        { provide: RadioPlayer, useValue: player },
        { provide: PLATFORM_ID, useValue: platform },
      ],
    });
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url, Home);
  }

  async function settle(): Promise<void> {
    harness.detectChanges();
    await harness.fixture.whenStable();
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

    const whatsapp = host().querySelector<HTMLAnchorElement>('.btn--whatsapp')!;
    expect(whatsapp.href).toBe(WHATSAPP_URL);
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
});

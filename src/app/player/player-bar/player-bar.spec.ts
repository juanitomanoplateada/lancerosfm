import { computed, PLATFORM_ID, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RadioPlayer } from '../radio-player';
import { PlayerState, Track } from '../track';
import { PlayerBar } from './player-bar';

/** Doble del reproductor: el estado se fija a mano y los controles se registran. */
class FakeRadioPlayer {
  readonly state = signal<PlayerState>('stopped');
  readonly track = signal<Track>({ artist: '', title: '' });
  readonly volume = signal(1);

  readonly isPlaying = computed(() => this.state() === 'playing');
  readonly isBusy = computed(() => this.state() === 'loading' || this.state() === 'reconnecting');
  readonly hasFailed = computed(() => this.state() === 'error');
  readonly isMuted = computed(() => this.volume() === 0);

  readonly toggle = vi.fn();
  readonly retry = vi.fn();
  readonly setVolume = vi.fn((value: number) => this.volume.set(value));
  readonly toggleMute = vi.fn(() => this.volume.set(this.volume() > 0 ? 0 : 1));
}

/** Doble de `matchMedia`: permite cambiar el ancho de la pantalla en mitad de la prueba. */
class FakeMediaQuery {
  private readonly listeners = new Set<(event: { matches: boolean }) => void>();

  constructor(public matches: boolean) {}

  addEventListener(_type: 'change', listener: (event: { matches: boolean }) => void): void {
    this.listeners.add(listener);
  }

  resize(matches: boolean): void {
    this.matches = matches;
    for (const listener of this.listeners) listener({ matches });
  }
}

describe('PlayerBar', () => {
  let player: FakeRadioPlayer;
  let media: FakeMediaQuery;
  let fixture: ComponentFixture<PlayerBar>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function render(options: { compact?: boolean; platform?: string } = {}): void {
    media = new FakeMediaQuery(options.compact ?? false);
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => media),
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: RadioPlayer, useValue: player },
        { provide: PLATFORM_ID, useValue: options.platform ?? 'browser' },
      ],
    });
    fixture = TestBed.createComponent(PlayerBar);
    fixture.autoDetectChanges();
  }

  async function settle(): Promise<void> {
    await fixture.whenStable();
  }

  function playButton(): HTMLButtonElement {
    return host().querySelector<HTMLButtonElement>('.play-btn')!;
  }

  function volumeButton(): HTMLButtonElement {
    return host().querySelector<HTMLButtonElement>('.volume-btn')!;
  }

  function volumeControl(): HTMLElement {
    return host().querySelector<HTMLElement>('.volume-control')!;
  }

  function slider(): HTMLInputElement {
    return host().querySelector<HTMLInputElement>('input[type="range"]')!;
  }

  function announcement(): string {
    return host().querySelector('[aria-live="polite"]')!.textContent!.trim();
  }

  beforeEach(() => {
    player = new FakeRadioPlayer();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('reproducción', () => {
    it('es una región con nombre propio para los lectores de pantalla', () => {
      render();

      const region = host().querySelector('section');
      expect(region?.getAttribute('aria-label')).toBe('Reproductor de Lanceros Stereo 94.1 FM');
    });

    it('invita a sintonizar mientras no hay canción', () => {
      render();

      expect(playButton().getAttribute('aria-label')).toBe('Sintonizar la emisora en vivo');
      expect(host().querySelector('.metadata-desktop')?.textContent).toContain(
        'Presiona ▶ para sintonizar la 94.1 FM',
      );
      expect(announcement()).toBe('');
    });

    it('pasa el botón al reproductor', () => {
      render();

      playButton().click();

      expect(player.toggle).toHaveBeenCalledTimes(1);
    });

    it('ofrece pausar mientras suena', async () => {
      render();

      player.state.set('playing');
      await settle();

      expect(playButton().getAttribute('aria-label')).toBe('Pausar la emisora');
    });

    it('marca el botón como ocupado mientras conecta', async () => {
      render();

      player.state.set('reconnecting');
      await settle();

      expect(playButton().classList).toContain('is-busy');
      expect(host().querySelector('.spinner')).not.toBeNull();
    });
  });

  describe('canción al aire', () => {
    it('anuncia artista y título una sola vez', async () => {
      render();

      player.track.set({ artist: 'Jorge Celedón', title: 'Ay hombe' });
      await settle();

      expect(announcement()).toBe('Sonando ahora: Jorge Celedón, Ay hombe');
      expect(host().querySelector('.metadata-desktop')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('anuncia solo el título cuando no hay artista', async () => {
      render();

      player.track.set({ artist: '', title: 'Cuña institucional' });
      await settle();

      expect(announcement()).toBe('Sonando ahora: Cuña institucional');
      expect(host().querySelector('.metadata-desktop .artist')).toBeNull();
    });

    it('activa la marquesina en el celular solo cuando hay un título de verdad', async () => {
      render();
      const track = () => host().querySelector('.metadata-mobile__track')!;
      expect(track().classList).toContain('is-static');

      player.track.set({ artist: 'Binomio de Oro', title: 'Momentos' });
      await settle();

      expect(track().classList).not.toContain('is-static');
      expect(track().querySelectorAll('.metadata__text')).toHaveLength(2);
    });
  });

  describe('cuando falla la conexión', () => {
    it('lo dice y ofrece reintentar', async () => {
      render();

      player.state.set('error');
      await settle();

      expect(announcement()).toBe('No se pudo conectar con la emisora.');
      host().querySelector<HTMLButtonElement>('.player-error__retry')!.click();
      expect(player.retry).toHaveBeenCalledTimes(1);
    });
  });

  describe('volumen en pantallas anchas', () => {
    it('silencia directamente con el botón', async () => {
      render();
      expect(volumeButton().getAttribute('aria-label')).toBe('Silenciar');

      volumeButton().click();
      await settle();

      expect(player.toggleMute).toHaveBeenCalledTimes(1);
      expect(volumeButton().getAttribute('aria-label')).toBe('Activar el sonido');
    });

    it('lleva el deslizador al reproductor y anuncia el porcentaje', async () => {
      render();

      slider().value = '0.35';
      slider().dispatchEvent(new Event('input'));
      await settle();

      expect(player.setVolume).toHaveBeenCalledWith(0.35);
      expect(slider().getAttribute('aria-valuetext')).toBe('35 por ciento');
    });
  });

  describe('volumen en el celular', () => {
    it('el primer toque despliega el deslizador y el segundo silencia', async () => {
      render({ compact: true });
      expect(volumeButton().getAttribute('aria-label')).toBe('Ajustar el volumen');

      volumeButton().click();
      await settle();
      expect(volumeControl().classList).toContain('is-expanded');
      expect(player.toggleMute).not.toHaveBeenCalled();
      expect(volumeButton().getAttribute('aria-label')).toBe('Silenciar');

      volumeButton().click();
      expect(player.toggleMute).toHaveBeenCalledTimes(1);
    });

    it('pliega el deslizador al tocar fuera de la barra', async () => {
      render({ compact: true });
      volumeButton().click();
      await settle();

      // Un toque dentro de la barra no lo cierra.
      slider().click();
      await settle();
      expect(volumeControl().classList).toContain('is-expanded');

      document.body.click();
      await settle();
      expect(volumeControl().classList).not.toContain('is-expanded');
    });

    it('no hace nada con los toques fuera si el deslizador está plegado', async () => {
      render({ compact: true });

      document.body.click();
      await settle();

      expect(volumeControl().classList).not.toContain('is-expanded');
      expect(volumeButton().getAttribute('aria-label')).toBe('Ajustar el volumen');
    });

    it('se adapta si la pantalla cambia de tamaño', async () => {
      render({ compact: true });
      volumeButton().click();
      await settle();

      // Al girar el celular a horizontal deja de ser compacta: nada queda desplegado.
      media.resize(false);
      await settle();
      expect(volumeControl().classList).not.toContain('is-expanded');
      expect(volumeButton().getAttribute('aria-label')).toBe('Silenciar');

      media.resize(true);
      await settle();
      expect(volumeButton().getAttribute('aria-label')).toBe('Ajustar el volumen');
    });
  });

  describe('durante el prerender', () => {
    it('no consulta el ancho de pantalla, que no existe en el servidor', () => {
      render({ compact: true, platform: 'server' });

      expect(globalThis.matchMedia).not.toHaveBeenCalled();
      expect(volumeButton().getAttribute('aria-label')).toBe('Silenciar');
    });
  });
});

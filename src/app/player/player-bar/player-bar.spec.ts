import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WHATSAPP_URL } from '../../station/station';
import { LivePlayerPresence } from '../live-player-presence';
import { RadioPlayer } from '../radio-player';
import { PlayerState, Track } from '../track';
import { PlayerBar } from './player-bar';

/** Doble del reproductor: el estado se fija a mano y los controles se registran. */
class FakeRadioPlayer {
  readonly state = signal<PlayerState>('stopped');
  readonly track = signal<Track>({ artist: '', title: '' });
  readonly volume = signal(1);
  readonly canSetVolume = signal(true);

  readonly isPlaying = computed(() => this.state() === 'playing');
  readonly isBusy = computed(() => this.state() === 'loading' || this.state() === 'reconnecting');
  readonly hasFailed = computed(() => this.state() === 'error');
  readonly isMuted = computed(() => this.volume() === 0);

  readonly toggle = vi.fn();
  readonly retry = vi.fn();
  readonly setVolume = vi.fn((value: number) => this.volume.set(value));
  readonly toggleMute = vi.fn(() => this.volume.set(this.volume() > 0 ? 0 : 1));
}

describe('PlayerBar', () => {
  let player: FakeRadioPlayer;
  let fixture: ComponentFixture<PlayerBar>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function render(): void {
    TestBed.configureTestingModule({
      providers: [{ provide: RadioPlayer, useValue: player }],
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

  function slider(): HTMLInputElement | null {
    return host().querySelector<HTMLInputElement>('input[type="range"]');
  }

  function announcement(): string {
    return host().querySelector('[aria-live="polite"]')!.textContent!.trim();
  }

  /** Lo que la barra muestra donde va el nombre de la canción. */
  function title(): string {
    return host().querySelector('.track__title')!.textContent!.trim();
  }

  /** Pulsa la barra espaciadora con el foco en el elemento dado. */
  function pressSpace(target: EventTarget, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key: ' ',
      code: 'Space',
      bubbles: true,
      cancelable: true,
      ...init,
    });
    target.dispatchEvent(event);
    return event;
  }

  beforeEach(() => {
    player = new FakeRadioPlayer();
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
      expect(title()).toBe('Presiona ▶ para sintonizar la 94.1 FM');
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

  describe('sin título de canción', () => {
    it('avisa de que está conectando', async () => {
      render();

      player.state.set('loading');
      await settle();

      expect(title()).toBe('Conectando…');
    });

    it('dice que está en vivo en vez de seguir invitando a sintonizar', async () => {
      render();

      player.state.set('playing');
      await settle();

      expect(title()).toBe('En vivo · 94.1 FM');
    });

    it('cede el sitio a la canción en cuanto llega el título', async () => {
      render();
      player.state.set('playing');

      player.track.set({ artist: '', title: 'Cuña institucional' });
      await settle();

      expect(title()).toBe('Cuña institucional');
    });
  });

  describe('canción al aire', () => {
    it('la muestra en dos renglones: el artista arriba y la canción debajo', async () => {
      render();

      player.track.set({ artist: 'Jorge Celedón', title: 'Ay hombe' });
      await settle();

      const lines = [...host().querySelectorAll('.track > span')].map((line) =>
        line.textContent?.trim(),
      );
      expect(lines).toEqual(['Jorge Celedón', 'Ay hombe']);
      expect(host().querySelector('.track__title--alone')).toBeNull();
    });

    it('deja que el título ocupe los dos renglones cuando no hay artista', async () => {
      render();

      player.track.set({ artist: '', title: 'Cuña institucional' });
      await settle();

      expect(host().querySelector('.track__artist')).toBeNull();
      expect(host().querySelector('.track__title')?.classList).toContain('track__title--alone');
    });

    it('anuncia artista y título una sola vez', async () => {
      render();

      player.track.set({ artist: 'Jorge Celedón', title: 'Ay hombe' });
      await settle();

      expect(announcement()).toBe('Sonando ahora: Jorge Celedón, Ay hombe');
      expect(host().querySelector('.track')?.getAttribute('aria-hidden')).toBe('true');
    });

    it('anuncia solo el título cuando no hay artista', async () => {
      render();

      player.track.set({ artist: '', title: 'Cuña institucional' });
      await settle();

      expect(announcement()).toBe('Sonando ahora: Cuña institucional');
    });
  });

  describe('cuando falla la conexión', () => {
    it('lo dice y ofrece reintentar', async () => {
      render();

      player.state.set('error');
      await settle();

      expect(announcement()).toBe('No se pudo conectar con la emisora.');
      expect(host().querySelector('.player-error')?.textContent).toContain(
        'Sin conexión con la emisora',
      );
      expect(host().querySelector('.track')).toBeNull();

      host().querySelector<HTMLButtonElement>('.player-error__retry')!.click();
      expect(player.retry).toHaveBeenCalledTimes(1);
    });
  });

  describe('pedir una canción', () => {
    it('lleva al WhatsApp de la emisora con la petición ya empezada', () => {
      render();

      const request = host().querySelector<HTMLAnchorElement>('.request-btn')!;
      expect(request.href).toBe(WHATSAPP_URL);
      expect(request.getAttribute('aria-label')).toBe('Pedir una canción por WhatsApp');
      expect(request.target).toBe('_blank');
    });
  });

  describe('volumen', () => {
    it('silencia con el botón y lo dice en su nombre', async () => {
      render();
      expect(volumeButton().getAttribute('aria-label')).toBe('Silenciar');

      volumeButton().click();
      await settle();

      expect(player.toggleMute).toHaveBeenCalledTimes(1);
      expect(volumeButton().getAttribute('aria-label')).toBe('Activar el sonido');
    });

    it('cambia el dibujo del altavoz cuando el volumen va bajo', async () => {
      render();
      const waves = () => volumeButton().querySelectorAll('path').length;
      const full = waves();

      player.volume.set(0.3);
      await settle();

      expect(waves()).toBeLessThan(full);
    });

    it('lleva el deslizador al reproductor y anuncia el porcentaje', async () => {
      render();

      slider()!.value = '0.35';
      slider()!.dispatchEvent(new Event('input'));
      await settle();

      expect(player.setVolume).toHaveBeenCalledWith(0.35);
      expect(slider()!.getAttribute('aria-valuetext')).toBe('35 por ciento');
    });

    it('pinta la pista del deslizador hasta donde va el volumen', async () => {
      render();

      player.volume.set(0.6);
      await settle();

      expect(slider()!.style.getPropertyValue('--volume-fill')).toBe('60%');
    });

    it('quita el deslizador donde el navegador no deja tocar el volumen', async () => {
      render();

      player.canSetVolume.set(false);
      await settle();

      // El silencio sí funciona en todas partes, así que el botón se queda.
      expect(slider()).toBeNull();
      expect(volumeButton()).not.toBeNull();
    });
  });

  describe('barra espaciadora', () => {
    it('pausa o reanuda desde cualquier parte de la página, sin que esta baje', () => {
      render();

      const event = pressSpace(document.body);

      expect(player.toggle).toHaveBeenCalledTimes(1);
      expect(event.defaultPrevented).toBe(true);
    });

    it('funciona también cuando nada tiene el foco', () => {
      render();

      pressSpace(document);

      expect(player.toggle).toHaveBeenCalledTimes(1);
    });

    it('no se mete cuando el foco está en un botón, un enlace o un campo', () => {
      render();
      const field = document.createElement('input');
      document.body.append(field);

      const onButton = pressSpace(volumeButton());
      const onField = pressSpace(field);

      expect(player.toggle).not.toHaveBeenCalled();
      expect(onButton.defaultPrevented).toBe(false);
      expect(onField.defaultPrevented).toBe(false);

      field.remove();
    });

    it('no dispara una ráfaga si la tecla se queda apretada', () => {
      render();

      pressSpace(document.body, { repeat: true });

      expect(player.toggle).not.toHaveBeenCalled();
    });

    it('deja pasar las combinaciones con otras teclas', () => {
      render();

      pressSpace(document.body, { shiftKey: true });

      expect(player.toggle).not.toHaveBeenCalled();
    });
  });

  describe('con el reproductor grande de la portada a la vista', () => {
    it('se marca como redundante, y deja de estarlo cuando el oyente baja', async () => {
      render();
      const livePlayer = TestBed.inject(LivePlayerPresence);
      expect(host().classList).not.toContain('is-redundant');

      livePlayer.set(true);
      await settle();
      expect(host().classList).toContain('is-redundant');

      livePlayer.set(false);
      await settle();
      expect(host().classList).not.toContain('is-redundant');
    });
  });
});

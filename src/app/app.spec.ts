import { computed, signal } from '@angular/core';
import {
  ComponentFixture,
  DeferBlockBehavior,
  DeferBlockState,
  TestBed,
} from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';
import { RadioPlayer } from './player/radio-player';
import { PlayerState, Track } from './player/track';
import { PageMetadata } from './seo/page-metadata';

function structuredData(id: string): Record<string, unknown> {
  return JSON.parse(document.getElementById(`ld-${id}`)?.textContent ?? '{}');
}

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let host: HTMLElement;

  beforeEach(async () => {
    document.head.querySelectorAll('script[type$="ld+json"]').forEach((script) => script.remove());
    // jsdom no tiene `EventSource`: se anula para que nada intente salir a la red.
    vi.stubGlobal('EventSource', undefined);

    TestBed.configureTestingModule({
      // La aplicación trae una pieza de carga diferida: se declara aquí y se
      // compila antes de montarla para que TestBed la tenga resuelta.
      imports: [App],
      providers: [provideRouter([])],
      // Lo diferido se trae cuando la prueba lo pide, no cuando jsdom «queda libre».
      deferBlockBehavior: DeferBlockBehavior.Manual,
    });
    await TestBed.compileComponents();
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('describe a la emisora y al sitio para los buscadores en todas las páginas', () => {
    expect(structuredData('station')['@type']).toBe('RadioStation');
    expect(structuredData('website')['@type']).toBe('WebSite');
  });

  it('ofrece saltar directo al contenido a quien navega con teclado', () => {
    const skipLink = host.querySelector('a.skip-link');
    const main = host.querySelector('main');

    expect(skipLink?.getAttribute('href')).toBe('#contenido');
    expect(main?.id).toBe('contenido');
    expect(main?.querySelector('router-outlet')).not.toBeNull();
  });

  it('deja la barra del reproductor fuera del router, para que la música no se corte', () => {
    const playerBar = host.querySelector('app-player-bar');

    expect(playerBar).not.toBeNull();
    expect(playerBar?.closest('main')).toBeNull();
  });

  it('monta cabecera, pestañas, pie y avisos', () => {
    for (const selector of [
      'app-site-header',
      'app-tab-bar',
      'app-site-footer',
      'app-toast-list',
    ]) {
      expect(host.querySelector(selector), selector).not.toBeNull();
    }
  });

  it('trae el contacto rápido aparte, para no cargarle su peso al arranque', async () => {
    expect(host.querySelector('app-floating-contact')).toBeNull();

    const [bubble] = await fixture.getDeferBlocks();
    await bubble.render(DeferBlockState.Complete);

    expect(host.querySelector('app-floating-contact')).not.toBeNull();
  });
});

describe('App: título de la pestaña', () => {
  /** Doble del reproductor con lo que leen la aplicación y sus barras. */
  class FakeRadioPlayer {
    readonly state = signal<PlayerState>('stopped');
    readonly track = signal<Track>({ artist: '', title: '' });
    readonly volume = signal(1);
    readonly canSetVolume = signal(true);
    readonly isPlaying = computed(() => this.state() === 'playing');
    readonly isBusy = signal(false);
    readonly hasFailed = signal(false);
    readonly isMuted = signal(false);
  }

  let player: FakeRadioPlayer;
  let fixture: ComponentFixture<App>;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    player = new FakeRadioPlayer();
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RadioPlayer, useValue: player }],
      deferBlockBehavior: DeferBlockBehavior.Manual,
    });
    TestBed.inject(PageMetadata).setPage({ path: '/', title: 'Portada', description: 'x' });
    fixture = TestBed.createComponent(App);
    await settle();
  });

  it('es el de la página mientras la emisora no suena', async () => {
    player.track.set({ artist: 'Jorge Celedón', title: 'Ay hombe' });
    await settle();

    expect(document.title).toBe('Portada');
  });

  it('dice artista y canción mientras suena', async () => {
    player.track.set({ artist: 'Jorge Celedón', title: 'Ay hombe' });
    player.state.set('playing');
    await settle();

    expect(document.title).toBe('▶ Jorge Celedón – Ay hombe · Lanceros Stereo 94.1 FM');
  });

  it('dice solo el título cuando lo que suena no trae artista', async () => {
    player.track.set({ artist: '', title: 'Cuña institucional' });
    player.state.set('playing');
    await settle();

    expect(document.title).toBe('▶ Cuña institucional · Lanceros Stereo 94.1 FM');
  });

  it('dice que está en vivo cuando suena sin título', async () => {
    player.state.set('playing');
    await settle();

    expect(document.title).toBe('▶ En vivo · Lanceros Stereo 94.1 FM');
  });

  it('vuelve al título de la página al pausar', async () => {
    player.state.set('playing');
    await settle();

    player.state.set('stopped');
    await settle();

    expect(document.title).toBe('Portada');
  });
});

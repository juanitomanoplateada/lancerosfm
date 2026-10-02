import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app';

function structuredData(id: string): Record<string, unknown> {
  return JSON.parse(document.getElementById(`ld-${id}`)?.textContent ?? '{}');
}

describe('App', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.head.querySelectorAll('script[type$="ld+json"]').forEach((script) => script.remove());
    // jsdom no tiene `matchMedia` ni `EventSource`: el primero lo pide la barra
    // del reproductor; el segundo se anula para que nada intente salir a la red.
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn() }));
    vi.stubGlobal('EventSource', undefined);

    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
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

  it('monta cabecera, pie, contacto rápido y avisos', () => {
    for (const selector of [
      'app-site-header',
      'app-site-footer',
      'app-floating-contact',
      'app-toast-list',
    ]) {
      expect(host.querySelector(selector), selector).not.toBeNull();
    }
  });
});

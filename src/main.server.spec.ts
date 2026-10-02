import { PlatformRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { App } from './app/app';

/**
 * Importar la configuración de servidor tiene un efecto global: al evaluarse,
 * `provideServerRendering` pone `ngServerMode` a `true` en todo el proceso. Las
 * pruebas corren sobre la plataforma de navegador de TestBed y comparten proceso
 * con las demás, así que se importa aquí dentro y se deshace ese cambio.
 */
async function importServerBootstrap() {
  const wasDefined = 'ngServerMode' in globalThis;
  const { default: bootstrap } = await import('./main.server');
  if (!wasDefined) Reflect.deleteProperty(globalThis, 'ngServerMode');
  return bootstrap;
}

describe('arranque para el prerender', () => {
  let host: HTMLElement;

  beforeEach(() => {
    // jsdom no tiene `matchMedia` ni `EventSource`, y no implementa `scrollTo`.
    vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn() }));
    vi.stubGlobal('EventSource', undefined);
    vi.stubGlobal('scrollTo', vi.fn());
    host = document.createElement('app-root');
    document.body.append(host);
  });

  afterEach(() => {
    host.remove();
    vi.unstubAllGlobals();
  });

  it('monta la aplicación completa sobre la plataforma que recibe', async () => {
    const bootstrap = await importServerBootstrap();
    const platformRef = TestBed.inject(PlatformRef);

    const appRef = await bootstrap({ platformRef });

    try {
      expect(appRef.injector.get(PlatformRef)).toBe(platformRef);
      expect(appRef.components[0].instance).toBeInstanceOf(App);

      await appRef.whenStable();
      expect(host.querySelector('app-site-header')).not.toBeNull();
      expect(host.querySelector('app-player-bar')).not.toBeNull();
    } finally {
      appRef.destroy();
    }
  });
});

import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { AppInstall } from './app-install';

/** El aviso de instalación de Chrome, con el diálogo sustituido por un doble. */
function installPrompt(prompt = vi.fn(() => Promise.resolve())): Event & { prompt: typeof prompt } {
  return Object.assign(new Event('beforeinstallprompt'), { prompt });
}

/** Hace pasar a jsdom por otro dispositivo durante una prueba. */
function pretendDevice(device: Partial<Record<'userAgent' | 'platform', string>>): void {
  for (const [property, value] of Object.entries(device)) {
    vi.spyOn(navigator, property as 'userAgent', 'get').mockReturnValue(value);
  }
}

function start(platform = 'browser'): AppInstall {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
  const appInstall = TestBed.inject(AppInstall);
  appInstall.listen();
  return appInstall;
}

describe('AppInstall', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    Reflect.deleteProperty(navigator, 'standalone');
    Reflect.deleteProperty(navigator, 'maxTouchPoints');
  });

  it('arranca sin nada que ofrecer: ni botón, ni instalada, ni iPhone', () => {
    const appInstall = start();

    expect(appInstall.canPrompt()).toBe(false);
    expect(appInstall.isInstalled()).toBe(false);
    expect(appInstall.isAppleMobile()).toBe(false);
  });

  describe('donde el navegador deja instalar de un toque', () => {
    it('guarda el aviso y ofrece el botón, sin quitarle al navegador el suyo', () => {
      const appInstall = start();
      const event = installPrompt();
      const preventDefault = vi.spyOn(event, 'preventDefault');

      globalThis.dispatchEvent(event);

      expect(appInstall.canPrompt()).toBe(true);
      expect(preventDefault).not.toHaveBeenCalled();
    });

    it('abre el diálogo del navegador y deja de ofrecer el botón, que solo sirve una vez', async () => {
      const appInstall = start();
      const event = installPrompt();
      globalThis.dispatchEvent(event);

      await appInstall.install();

      expect(event.prompt).toHaveBeenCalledTimes(1);
      expect(appInstall.canPrompt()).toBe(false);
    });

    it('no se rompe si el navegador ya no acepta el aviso', async () => {
      const appInstall = start();
      globalThis.dispatchEvent(installPrompt(vi.fn(() => Promise.reject(new Error('usado')))));

      await expect(appInstall.install()).resolves.toBeUndefined();
      expect(appInstall.canPrompt()).toBe(false);
    });

    it('no hace nada si no hay aviso guardado', async () => {
      await expect(start().install()).resolves.toBeUndefined();
    });

    it('se da por instalada en cuanto el navegador lo confirma', () => {
      const appInstall = start();
      globalThis.dispatchEvent(installPrompt());

      globalThis.dispatchEvent(new Event('appinstalled'));

      expect(appInstall.isInstalled()).toBe(true);
      expect(appInstall.canPrompt()).toBe(false);
    });
  });

  describe('cuando ya se abre como aplicación', () => {
    it('lo sabe por el modo de pantalla', () => {
      const matchMedia = vi.fn(() => ({ matches: true }));
      vi.stubGlobal('matchMedia', matchMedia);

      expect(start().isInstalled()).toBe(true);
      expect(matchMedia).toHaveBeenCalledWith('(display-mode: standalone)');
    });

    it('no la da por instalada si se está viendo en el navegador', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );

      expect(start().isInstalled()).toBe(false);
    });

    it('lo sabe también en el iPhone, que lo avisa a su manera', () => {
      Object.defineProperty(navigator, 'standalone', { value: true, configurable: true });

      expect(start().isInstalled()).toBe(true);
    });
  });

  describe('en iPhone y iPad, que no tienen botón de instalar', () => {
    it('reconoce el iPhone', () => {
      pretendDevice({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });

      expect(start().isAppleMobile()).toBe(true);
    });

    it('reconoce el iPad aunque se presente como un Mac, por la pantalla táctil', () => {
      pretendDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
      });
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });

      expect(start().isAppleMobile()).toBe(true);
    });

    it('no confunde un Mac de verdad con un iPad', () => {
      pretendDevice({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        platform: 'MacIntel',
      });
      Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true });

      expect(start().isAppleMobile()).toBe(false);
    });
  });

  describe('durante el prerender', () => {
    it('no escucha nada: en el servidor no hay navegador que avise', () => {
      const addEventListener = vi.spyOn(globalThis, 'addEventListener');

      const appInstall = start('server');

      expect(addEventListener).not.toHaveBeenCalled();
      expect(appInstall.canPrompt()).toBe(false);
    });
  });
});

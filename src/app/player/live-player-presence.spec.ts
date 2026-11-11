import { makeStateKey, PLATFORM_ID, TransferState } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { LivePlayerPresence } from './live-player-presence';

/** Lo que el servidor deja escrito en el HTML, tal como lo recibe el navegador. */
function prerender(report: (presence: LivePlayerPresence) => void): Record<string, unknown> {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
  report(TestBed.inject(LivePlayerPresence));
  const written = JSON.parse(TestBed.inject(TransferState).toJson()) as Record<string, unknown>;
  TestBed.resetTestingModule();
  return written;
}

/** Arranca la aplicación en el navegador con el estado que llegó en el HTML. */
function bootInBrowser(received: Record<string, unknown>): LivePlayerPresence {
  TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
  const transferState = TestBed.inject(TransferState);
  for (const [key, value] of Object.entries(received)) {
    transferState.set(makeStateKey<unknown>(key), value);
  }
  return TestBed.inject(LivePlayerPresence);
}

describe('LivePlayerPresence', () => {
  it('arranca sin reproductor grande a la vista: fuera de la portada no lo hay', () => {
    expect(TestBed.inject(LivePlayerPresence).onScreen()).toBe(false);
  });

  it('publica lo que la portada le va contando', () => {
    const presence = TestBed.inject(LivePlayerPresence);

    presence.set(true);
    expect(presence.onScreen()).toBe(true);

    presence.set(false);
    expect(presence.onScreen()).toBe(false);
  });

  describe('del prerender al navegador', () => {
    it('arranca con lo que vio el servidor, para que la barra no se asome al cargar', () => {
      const html = prerender((presence) => presence.set(true));

      expect(bootInBrowser(html).onScreen()).toBe(true);
    });

    it('arranca sin nada a la vista en las páginas que no tienen reproductor grande', () => {
      const html = prerender(() => undefined);

      expect(bootInBrowser(html).onScreen()).toBe(false);
    });

    it('no anota nada desde el navegador: ese estado solo viaja del servidor hacia acá', () => {
      const presence = bootInBrowser({});

      presence.set(true);

      expect(JSON.parse(TestBed.inject(TransferState).toJson())).toEqual({});
    });
  });
});

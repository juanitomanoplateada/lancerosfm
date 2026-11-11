import { Component, PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LivePlayerAnchor } from './live-player-anchor';
import { LivePlayerPresence } from './live-player-presence';

@Component({
  imports: [LivePlayerAnchor],
  template: `<button type="button" appLivePlayerAnchor>Escuchar en vivo</button>`,
})
class PageWithBigPlayer {}

/**
 * Doble del observador de visibilidad, que jsdom no trae: la prueba decide
 * cuándo entra y cuándo sale de pantalla lo que se está vigilando.
 */
class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];

  readonly observed: Element[] = [];
  readonly disconnect = vi.fn();

  constructor(
    private readonly notify: (entries: { intersectionRatio: number }[]) => void,
    readonly options: IntersectionObserverInit,
  ) {
    FakeIntersectionObserver.instances.push(this);
  }

  observe(element: Element): void {
    this.observed.push(element);
  }

  /** Parte del elemento que se ve, en el orden en que la iría dando el navegador. */
  report(...visibleFractions: number[]): void {
    this.notify(visibleFractions.map((intersectionRatio) => ({ intersectionRatio })));
  }
}

describe('LivePlayerAnchor', () => {
  let fixture: ComponentFixture<PageWithBigPlayer>;

  async function render(platform = 'browser'): Promise<void> {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: platform }] });
    fixture = TestBed.createComponent(PageWithBigPlayer);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  }

  function observer(): FakeIntersectionObserver {
    return FakeIntersectionObserver.instances.at(-1)!;
  }

  function presence(): LivePlayerPresence {
    return TestBed.inject(LivePlayerPresence);
  }

  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('da el elemento por visible al abrir la página y se pone a vigilarlo', async () => {
    await render();

    expect(presence().onScreen()).toBe(true);
    expect(observer().observed).toEqual([fixture.nativeElement.querySelector('button')]);
  });

  it('avisa cuando el oyente baja por la página y cuando vuelve a subir', async () => {
    await render();

    observer().report(0);
    expect(presence().onScreen()).toBe(false);

    observer().report(1);
    expect(presence().onScreen()).toBe(true);
  });

  it('solo lo da por visible si se ve casi entero, no cuando apenas asoma', async () => {
    await render();
    expect(observer().options).toEqual({ threshold: 0.75 });

    // Con el celular acostado el botón queda cortado por abajo.
    observer().report(0.58);
    expect(presence().onScreen()).toBe(false);

    observer().report(0.75);
    expect(presence().onScreen()).toBe(true);
  });

  it('se queda con el último cambio si llegan varios juntos', async () => {
    await render();

    observer().report(1, 0);

    expect(presence().onScreen()).toBe(false);
  });

  it('deja de vigilar y devuelve la barra al salir de la página', async () => {
    await render();
    const livePlayer = presence();

    fixture.destroy();

    expect(observer().disconnect).toHaveBeenCalledTimes(1);
    expect(livePlayer.onScreen()).toBe(false);
  });

  it('deja la barra siempre a la vista en un navegador sin observador', async () => {
    vi.stubGlobal('IntersectionObserver', undefined);

    await render();

    expect(presence().onScreen()).toBe(false);
  });

  it('lo da por visible en el prerender, sin vigilar nada', async () => {
    await render('server');

    expect(presence().onScreen()).toBe(true);
    expect(FakeIntersectionObserver.instances).toHaveLength(0);
  });
});

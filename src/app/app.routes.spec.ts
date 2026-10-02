import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { routes } from './app.routes';
import { About } from './pages/about/about';
import { Contact } from './pages/contact/contact';
import { Home } from './pages/home/home';
import { HowToListen } from './pages/how-to-listen/how-to-listen';
import { NotFound } from './pages/not-found/not-found';

describe('rutas', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    // La portada crea el reproductor; sin EventSource no intenta salir a la red.
    vi.stubGlobal('EventSource', undefined);
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each<[string, Type<unknown>]>([
    ['/', Home],
    ['/nosotros', About],
    ['/como-escuchar', HowToListen],
    ['/contacto', Contact],
    ['/404', NotFound],
  ])('%s abre la página que le corresponde', async (url, page) => {
    const component = await harness.navigateByUrl(url);

    expect(component).toBeInstanceOf(page);
  });

  it('muestra el aviso de página inexistente sin cambiar la dirección equivocada', async () => {
    await harness.navigateByUrl('/emisoras/otra', NotFound);

    expect(TestBed.inject(Router).url).toBe('/emisoras/otra');
  });
});

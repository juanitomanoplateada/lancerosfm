import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { NotFound } from './not-found';

describe('NotFound', () => {
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFound);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('pide a los buscadores que no la indexen', () => {
    expect(document.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe(
      'noindex, follow',
    );
    expect(document.title).toBe('Página no encontrada | Lanceros Stereo 94.1 FM');
  });

  it('devuelve al oyente al reproductor', () => {
    expect(host.querySelector('h1')?.textContent).toBe('Esta página no existe');
    expect(host.querySelector('a.btn')?.getAttribute('href')).toBe('/');
  });
});

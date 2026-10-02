import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { RadioPlayer } from '../../player/radio-player';
import { SiteHeader } from './site-header';

describe('SiteHeader', () => {
  const isPlaying = signal(false);
  let fixture: ComponentFixture<SiteHeader>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    isPlaying.set(false);
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: RadioPlayer, useValue: { isPlaying } }],
    });
    fixture = TestBed.createComponent(SiteHeader);
    fixture.autoDetectChanges();
  });

  it('enlaza las cuatro secciones del sitio', () => {
    const links = [...host().querySelectorAll('nav a')].map((link) => link.getAttribute('href'));

    expect(links).toEqual(['/', '/como-escuchar', '/nosotros', '/contacto']);
  });

  it('enciende el distintivo «Al aire» solo mientras suena la emisora', async () => {
    expect(host().querySelector('.navbar__on-air')).toBeNull();

    isPlaying.set(true);
    await fixture.whenStable();
    expect(host().querySelector('.navbar__on-air')?.textContent).toContain('Al aire');

    isPlaying.set(false);
    await fixture.whenStable();
    expect(host().querySelector('.navbar__on-air')).toBeNull();
  });
});

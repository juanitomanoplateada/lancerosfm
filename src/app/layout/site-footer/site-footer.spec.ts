import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { SiteFooter } from './site-footer';

describe('SiteFooter', () => {
  let host: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(SiteFooter);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('firma con el año en curso', () => {
    expect(host.querySelector('.site-footer__legal')?.textContent).toContain(
      `© ${new Date().getFullYear()} Lanceros Stereo 94.1 FM`,
    );
  });

  it('abre las redes y los enlaces externos en otra pestaña, sin exponer la página', () => {
    const external = [...host.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]')];

    expect(external).toHaveLength(5);
    for (const link of external) expect(link.rel).toBe('noopener noreferrer');
  });

  it('repite la navegación del sitio', () => {
    const sections = [...host.querySelectorAll('nav a')].map((link) => link.getAttribute('href'));

    expect(sections).toEqual(['/', '/como-escuchar', '/nosotros', '/contacto']);
  });
});

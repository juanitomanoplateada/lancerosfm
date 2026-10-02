import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { About } from './about';

function structuredData(id: string): Record<string, unknown> {
  return JSON.parse(document.getElementById(`ld-${id}`)?.textContent ?? '{}');
}

describe('About', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.head.querySelectorAll('script[type$="ld+json"]').forEach((script) => script.remove());
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(About);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('se presenta en los buscadores como la emisora de Tuta', () => {
    expect(document.title).toBe('Quiénes somos, la emisora de Tuta | Lanceros Stereo 94.1 FM');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      'https://www.lancerosfm.com/nosotros',
    );
  });

  it('publica la ruta de migas Inicio › Nosotros', () => {
    const items = structuredData('ruta')['itemListElement'] as { name: string }[];

    expect(items.map((item) => item.name)).toEqual(['Inicio', 'Nosotros']);
  });

  it('usa la cabecera común de las páginas interiores', () => {
    expect(host.querySelector('app-page-header h1')?.textContent).toBe(
      'Lanceros Stereo, la emisora de Tuta',
    );
  });

  it('no inventa integrantes mientras la emisora no entregue los nombres', () => {
    expect(host.querySelector('.team')).toBeNull();
    expect(host.textContent).toContain('Estamos preparando esta sección');
  });

  it('cierra invitando a contactar', () => {
    expect(host.querySelector('a.btn')?.getAttribute('href')).toBe('/contacto');
  });
});

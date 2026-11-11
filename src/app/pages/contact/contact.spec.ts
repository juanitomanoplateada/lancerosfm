import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WHATSAPP_URL } from '../../station/station';
import { Contact } from './contact';

function structuredData(id: string): Record<string, unknown> {
  return JSON.parse(document.getElementById(`ld-${id}`)?.textContent ?? '{}');
}

describe('Contact', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.head.querySelectorAll('script[type$="ld+json"]').forEach((script) => script.remove());
    const fixture = TestBed.createComponent(Contact);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('describe en los buscadores todas las formas de contacto', () => {
    expect(document.title).toBe('Contacto y peticiones | Lanceros Stereo 94.1 FM');
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toBe(
      'Escríbenos por WhatsApp al 310 268 8737, llámanos o visítanos en la Calle 4 # 5-93 de Tuta, Boyacá.',
    );
  });

  it('publica la ruta de migas Inicio › Contacto', () => {
    const items = structuredData('ruta')['itemListElement'] as { name: string }[];

    expect(items.map((item) => item.name)).toEqual(['Inicio', 'Contacto']);
  });

  it('destaca WhatsApp con la petición ya escrita', () => {
    const highlight = host.querySelector<HTMLAnchorElement>('a.highlight')!;

    expect(highlight.href).toBe(WHATSAPP_URL);
    expect(highlight.textContent).toContain('WhatsApp 310 268 8737');
  });

  it('mantiene el número de WhatsApp en una sola pieza, sin partirlo entre renglones', () => {
    expect(host.querySelector('.highlight__number')?.textContent).toBe('310 268 8737');
  });

  it('da teléfono, correo y dirección', () => {
    expect(host.querySelector('a[href="tel:+573102688737"]')).not.toBeNull();
    expect(host.querySelector('a[href="mailto:radiolanceros@hotmail.com"]')).not.toBeNull();
    expect(host.querySelector('address')?.textContent).toContain('Calle 4 # 5-93');
  });
});

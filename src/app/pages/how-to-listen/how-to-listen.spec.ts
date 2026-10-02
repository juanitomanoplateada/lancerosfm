import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { HowToListen } from './how-to-listen';

interface FaqEntry {
  name: string;
  acceptedAnswer: { text: string };
}

function structuredData(id: string): Record<string, unknown> {
  return JSON.parse(document.getElementById(`ld-${id}`)?.textContent ?? '{}');
}

describe('HowToListen', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.head.querySelectorAll('script[type$="ld+json"]').forEach((script) => script.remove());
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(HowToListen);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('publica su título para los buscadores', () => {
    expect(document.title).toBe('Cómo escucharnos en vivo | Lanceros Stereo 94.1 FM');
  });

  it('publica la ruta de migas Inicio › Cómo escuchar', () => {
    const items = structuredData('ruta')['itemListElement'] as { name: string }[];

    expect(items.map((item) => item.name)).toEqual(['Inicio', 'Cómo escuchar']);
  });

  it('publica como FAQPage exactamente las preguntas que se ven en pantalla', () => {
    const faq = structuredData('faq');
    const published = faq['mainEntity'] as FaqEntry[];
    const visible = [...host.querySelectorAll('.faq__item')].map((item) => ({
      question: item.querySelector('summary')?.textContent,
      answer: item.querySelector('.faq__answer')?.textContent,
    }));

    expect(faq['@type']).toBe('FAQPage');
    expect(visible.length).toBeGreaterThan(0);
    expect(
      published.map((entry) => ({ question: entry.name, answer: entry.acceptedAnswer.text })),
    ).toEqual(visible);
  });

  it('responde con los datos reales de la emisora', () => {
    expect(host.textContent).toContain('Escríbenos por WhatsApp al 310 268 8737');
    expect(host.textContent).toContain('En el 94.1 de la FM, en Tuta');
  });
});

import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PageMetadata } from './page-metadata';

function metaContent(selector: string): string | null {
  return document.head.querySelector(selector)?.getAttribute('content') ?? null;
}

describe('PageMetadata', () => {
  let pageMetadata: PageMetadata;

  beforeEach(() => {
    document.head
      .querySelectorAll('meta, link[rel="canonical"], script[type$="ld+json"]')
      .forEach((element) => element.remove());
    TestBed.configureTestingModule({});
    pageMetadata = TestBed.inject(PageMetadata);
  });

  it('añade el nombre de la emisora salvo en la portada', () => {
    pageMetadata.setPage({ path: '/', title: 'Portada', description: 'x' });
    expect(document.title).toBe('Portada');

    pageMetadata.setPage({ path: '/contacto', title: 'Contacto', description: 'x' });
    expect(document.title).toBe('Contacto | Lanceros Stereo 94.1 FM');
  });

  it('deja una sola descripción al cambiar de página', () => {
    pageMetadata.setPage({ path: '/', title: 'A', description: 'Primera' });
    pageMetadata.setPage({ path: '/contacto', title: 'B', description: 'Segunda' });

    expect(document.head.querySelectorAll('meta[name="description"]')).toHaveLength(1);
    expect(metaContent('meta[name="description"]')).toBe('Segunda');
  });

  it('publica el canónico absoluto y lo reutiliza entre páginas', () => {
    pageMetadata.setPage({ path: '/', title: 'A', description: 'x' });
    pageMetadata.setPage({ path: '/nosotros', title: 'B', description: 'x' });

    const canonicals = document.head.querySelectorAll('link[rel="canonical"]');
    expect(canonicals).toHaveLength(1);
    expect(canonicals[0].getAttribute('href')).toBe('https://www.lancerosfm.com/nosotros');
  });

  it('completa las etiquetas sociales con rutas absolutas', () => {
    pageMetadata.setPage({ path: '/nosotros', title: 'Nosotros', description: 'Sobre la emisora' });

    expect(metaContent('meta[property="og:url"]')).toBe('https://www.lancerosfm.com/nosotros');
    expect(metaContent('meta[property="og:image"]')).toBe(
      'https://www.lancerosfm.com/img/og-banner.jpg',
    );
    expect(metaContent('meta[property="og:locale"]')).toBe('es_CO');
    expect(metaContent('meta[name="twitter:card"]')).toBe('summary_large_image');
  });

  it('marca noindex solo cuando se pide', () => {
    pageMetadata.setPage({ path: '/', title: 'A', description: 'x' });
    expect(metaContent('meta[name="robots"]')).toContain('index, follow');

    pageMetadata.setPage({ path: '/404', title: 'B', description: 'x', noindex: true });
    expect(metaContent('meta[name="robots"]')).toBe('noindex, follow');
  });

  it('reemplaza los datos estructurados en lugar de acumularlos', () => {
    pageMetadata.setStructuredData('breadcrumb', { '@type': 'BreadcrumbList', name: 'primera' });
    pageMetadata.setStructuredData('breadcrumb', { '@type': 'BreadcrumbList', name: 'segunda' });

    const blocks = document.head.querySelectorAll('script[type="application/ld+json"]');
    expect(blocks).toHaveLength(1);
    expect(JSON.parse(blocks[0].textContent ?? '{}').name).toBe('segunda');
  });
});

import { DOCUMENT, inject, Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

import { STATION } from '../station/station';

export interface PageInfo {
  /** Sin el nombre de la emisora: se añade solo. */
  title: string;
  description: string;
  /** Ruta absoluta desde la raíz, con barra inicial. */
  path: string;
  /** Ruta a la imagen social; por defecto, el banner de la emisora. */
  image?: string;
  /** Para páginas que no deben aparecer en Google. */
  noindex?: boolean;
}

const DEFAULT_IMAGE = '/img/og-banner.jpg';

/**
 * Metadatos de cada página, en un solo lugar.
 *
 * Siempre se usa `updateTag` y nunca `addTag`: este último crea una etiqueta
 * nueva en lugar de reemplazar la existente, y Google acabaría recibiendo dos
 * descripciones distintas.
 *
 * Como el sitio se prerenderiza, estas etiquetas quedan escritas en el HTML de
 * cada ruta: el buscador las lee sin ejecutar JavaScript.
 */
@Injectable({ providedIn: 'root' })
export class PageMetadata {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  setPage({ title, description, path, image = DEFAULT_IMAGE, noindex = false }: PageInfo): void {
    const fullTitle = path === '/' ? title : `${title} | ${STATION.fullName}`;
    const url = `${STATION.origin}${path}`;
    const imageUrl = `${STATION.origin}${image}`;

    this.title.setTitle(fullTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({
      name: 'robots',
      content: noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large',
    });

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: STATION.fullName });
    this.meta.updateTag({ property: 'og:locale', content: 'es_CO' });
    this.meta.updateTag({ property: 'og:title', content: fullTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: url });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:width', content: '1200' });
    this.meta.updateTag({ property: 'og:image:height', content: '630' });
    this.meta.updateTag({
      property: 'og:image:alt',
      content: `${STATION.fullName}, emisora comunitaria de ${STATION.address.city}`,
    });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: fullTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });

    this.setCanonical(url);
  }

  /**
   * Inserta o reemplaza un bloque JSON-LD. El `id` evita duplicados al navegar:
   * cada bloque se sobrescribe en lugar de acumularse.
   */
  setStructuredData(id: string, data: Record<string, unknown>): void {
    const elementId = `ld-${id}`;
    const existing = this.document.getElementById(elementId);
    const script = existing ?? this.document.createElement('script');

    script.id = elementId;
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify(data);

    if (!existing) this.document.head.appendChild(script);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}

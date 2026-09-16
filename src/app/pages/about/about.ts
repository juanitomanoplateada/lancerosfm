import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageHeader } from '../../layout/page-header/page-header';
import { PageMetadata } from '../../seo/page-metadata';
import { breadcrumbSchema } from '../../seo/structured-data';
import { STATION } from '../../station/station';
import { TEAM } from '../../station/team';

@Component({
  selector: 'app-about',
  imports: [PageHeader, RouterLink],
  templateUrl: './about.html',
  styleUrl: './about.scss',
})
export class About {
  protected readonly station = STATION;
  protected readonly team = TEAM;

  constructor() {
    const pageMetadata = inject(PageMetadata);

    pageMetadata.setPage({
      path: '/nosotros',
      title: 'Quiénes somos, la emisora de Tuta',
      description:
        'Lanceros Stereo 94.1 FM es la emisora comunitaria de Tuta, Boyacá: quiénes somos, desde dónde transmitimos y cómo llega la señal hasta tu celular.',
    });

    pageMetadata.setStructuredData(
      'ruta',
      breadcrumbSchema([
        { name: 'Inicio', path: '/' },
        { name: 'Nosotros', path: '/nosotros' },
      ]),
    );
  }
}

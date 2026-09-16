import { Component, inject } from '@angular/core';

import { PageHeader } from '../../layout/page-header/page-header';
import { PageMetadata } from '../../seo/page-metadata';
import { breadcrumbSchema } from '../../seo/structured-data';
import { STATION, WHATSAPP_URL } from '../../station/station';

@Component({
  selector: 'app-contact',
  imports: [PageHeader],
  templateUrl: './contact.html',
  styleUrl: './contact.scss',
})
export class Contact {
  protected readonly station = STATION;
  protected readonly whatsappUrl = WHATSAPP_URL;

  constructor() {
    const pageMetadata = inject(PageMetadata);

    pageMetadata.setPage({
      path: '/contacto',
      title: 'Contacto y peticiones',
      description: `Escríbenos por WhatsApp al ${STATION.contact.phoneDisplay}, llámanos o visítanos en la ${STATION.address.street} de ${STATION.address.city}, ${STATION.address.region}.`,
    });

    pageMetadata.setStructuredData(
      'ruta',
      breadcrumbSchema([
        { name: 'Inicio', path: '/' },
        { name: 'Contacto', path: '/contacto' },
      ]),
    );
  }
}

import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PageMetadata } from '../../seo/page-metadata';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  templateUrl: './not-found.html',
  styleUrl: './not-found.scss',
})
export class NotFound {
  constructor() {
    inject(PageMetadata).setPage({
      path: '/404',
      title: 'Página no encontrada',
      description: 'La página que buscas no existe, pero la emisora sigue transmitiendo en vivo.',
      noindex: true,
    });
  }
}

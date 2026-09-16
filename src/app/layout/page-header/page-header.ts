import { Component, input } from '@angular/core';

/** Cabecera común de las páginas interiores: mismo ritmo visual en todas. */
@Component({
  selector: 'app-page-header',
  templateUrl: './page-header.html',
  styleUrl: './page-header.scss',
})
export class PageHeader {
  readonly eyebrow = input.required<string>();
  readonly title = input.required<string>();
  readonly lead = input<string>('');
}

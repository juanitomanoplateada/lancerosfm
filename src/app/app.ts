import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FloatingContact } from './layout/floating-contact/floating-contact';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';
import { PlayerBar } from './player/player-bar/player-bar';
import { PageMetadata } from './seo/page-metadata';
import { radioStationSchema, webSiteSchema } from './seo/structured-data';
import { ToastList } from './toasts/toast-list/toast-list';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, PlayerBar, FloatingContact, ToastList],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly pageMetadata = inject(PageMetadata);

  constructor() {
    // Datos que describen a la emisora entera; no cambian entre páginas.
    this.pageMetadata.setStructuredData('station', radioStationSchema());
    this.pageMetadata.setStructuredData('website', webSiteSchema());
  }
}

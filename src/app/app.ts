import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { FloatingContact } from './layout/floating-contact/floating-contact';
import { SiteFooter } from './layout/site-footer/site-footer';
import { SiteHeader } from './layout/site-header/site-header';
import { TabBar } from './layout/tab-bar/tab-bar';
import { PlayerBar } from './player/player-bar/player-bar';
import { RadioPlayer } from './player/radio-player';
import { PageMetadata } from './seo/page-metadata';
import { radioStationSchema, webSiteSchema } from './seo/structured-data';
import { ToastList } from './toasts/toast-list/toast-list';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, SiteHeader, SiteFooter, PlayerBar, TabBar, FloatingContact, ToastList],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  private readonly pageMetadata = inject(PageMetadata);
  private readonly player = inject(RadioPlayer);

  constructor() {
    // Datos que describen a la emisora entera; no cambian entre páginas.
    this.pageMetadata.setStructuredData('station', radioStationSchema());
    this.pageMetadata.setStructuredData('website', webSiteSchema());

    // Mientras suena, la pestaña del navegador dice qué canción es: quien tiene
    // la emisora de fondo se entera sin volver a la página.
    effect(() => {
      const { artist, title } = this.player.track();
      const song = artist && title ? `${artist} – ${title}` : title;
      this.pageMetadata.setNowPlaying(this.player.isPlaying() ? song || 'En vivo' : '');
    });
  }
}

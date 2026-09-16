import { isPlatformBrowser } from '@angular/common';
import { Component, inject, PLATFORM_ID } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { RadioPlayer } from '../../player/radio-player';
import { PageMetadata } from '../../seo/page-metadata';
import { STATION, WHATSAPP_URL } from '../../station/station';

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  private readonly player = inject(RadioPlayer);

  protected readonly station = STATION;
  protected readonly whatsappUrl = WHATSAPP_URL;

  protected readonly track = this.player.track;
  protected readonly isPlaying = this.player.isPlaying;
  protected readonly isBusy = this.player.isBusy;
  protected readonly hasFailed = this.player.hasFailed;

  constructor() {
    inject(PageMetadata).setPage({
      path: '/',
      title: 'Lanceros Stereo 94.1 FM en vivo — Emisora de Tuta, Boyacá',
      description:
        'Escucha en vivo Lanceros Stereo 94.1 FM, la emisora comunitaria de Tuta, Boyacá. Música popular, vallenato y rancheras las 24 horas, desde el celular o el computador.',
    });

    // Atajo «Escuchar en vivo» de la aplicación instalada: llega como /?play=1.
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    if (isBrowser && inject(ActivatedRoute).snapshot.queryParamMap.has('play')) {
      this.player.play();
    }
  }

  protected toggle(): void {
    this.player.toggle();
  }
}

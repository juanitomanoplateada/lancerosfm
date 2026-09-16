import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { RadioPlayer } from '../../player/radio-player';

@Component({
  selector: 'app-site-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './site-header.html',
  styleUrl: './site-header.scss',
})
export class SiteHeader {
  private readonly player = inject(RadioPlayer);

  /** El distintivo «al aire» solo se enciende cuando de verdad está sonando. */
  protected readonly isPlaying = this.player.isPlaying;
}

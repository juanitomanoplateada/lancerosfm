import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { STATION, WHATSAPP_URL } from '../../station/station';

@Component({
  selector: 'app-site-footer',
  imports: [RouterLink],
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly station = STATION;
  protected readonly whatsappUrl = WHATSAPP_URL;
  protected readonly year = new Date().getFullYear();
}

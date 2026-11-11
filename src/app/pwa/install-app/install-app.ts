import { Component, inject } from '@angular/core';

import { AppInstall } from '../app-install';

/**
 * Cómo dejar la emisora en la pantalla de inicio, dicho para el dispositivo que
 * el oyente tiene en la mano: un botón donde el navegador deja instalar de un
 * toque, los pasos del iPhone donde no, y las indicaciones generales en el
 * resto. En el prerender salen estas últimas, que valen para cualquiera.
 */
@Component({
  selector: 'app-install-app',
  templateUrl: './install-app.html',
  styleUrl: './install-app.scss',
})
export class InstallApp {
  private readonly appInstall = inject(AppInstall);

  protected readonly canPrompt = this.appInstall.canPrompt;
  protected readonly isInstalled = this.appInstall.isInstalled;
  protected readonly isAppleMobile = this.appInstall.isAppleMobile;

  protected install(): void {
    void this.appInstall.install();
  }
}

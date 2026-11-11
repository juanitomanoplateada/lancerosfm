import { isPlatformBrowser } from '@angular/common';
import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';

/**
 * El aviso con el que el navegador ofrece instalar la aplicación. Lo tienen los
 * navegadores basados en Chromium y todavía no figura en los tipos del DOM.
 */
interface InstallPromptEvent extends Event {
  prompt(): Promise<unknown>;
}

/** Safari en el iPhone avisa así de que la página se abrió desde su icono. */
interface AppleNavigator extends Navigator {
  standalone?: boolean;
}

/**
 * Instalación de la aplicación en el dispositivo.
 *
 * Cada navegador lo resuelve a su manera, y de aquí sale cuál de las tres le
 * toca al oyente: un botón que instala de un toque (Android y computador con
 * Chrome o Edge), los pasos a mano del iPhone, que no tiene tal botón, o las
 * indicaciones generales para todo lo demás.
 *
 * El aviso del navegador llega una sola vez, poco después de cargar la página,
 * así que hay que estar escuchando desde el arranque y no desde que se abre la
 * página que lo ofrece.
 */
@Injectable({ providedIn: 'root' })
export class AppInstall {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly promptEvent = signal<InstallPromptEvent | null>(null);
  private readonly installed = signal(false);
  private readonly appleMobile = signal(false);

  /** Hay un aviso guardado: se puede ofrecer el botón de instalar. */
  readonly canPrompt = computed(() => this.promptEvent() !== null);

  /** La página ya se está usando como aplicación instalada. */
  readonly isInstalled = this.installed.asReadonly();

  /** iPhone o iPad: no hay botón que valga y hay que explicar los pasos. */
  readonly isAppleMobile = this.appleMobile.asReadonly();

  listen(): void {
    if (!this.isBrowser) return;

    const apple = navigator as AppleNavigator;
    this.installed.set(
      apple.standalone === true ||
        globalThis.matchMedia?.('(display-mode: standalone)').matches === true,
    );

    // El iPad se presenta como un Mac; lo delata la pantalla táctil.
    this.appleMobile.set(
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
    );

    // No se cancela el aviso: así el navegador sigue mostrando el suyo cuando
    // quiera, y además queda guardado para el botón de la página.
    globalThis.addEventListener('beforeinstallprompt', (event) =>
      this.promptEvent.set(event as InstallPromptEvent),
    );

    globalThis.addEventListener('appinstalled', () => {
      this.promptEvent.set(null);
      this.installed.set(true);
    });
  }

  /** Abre el diálogo de instalación del navegador. */
  async install(): Promise<void> {
    const event = this.promptEvent();
    if (!event) return;

    // Cada aviso sirve una sola vez: usado, el botón deja de ofrecerse.
    this.promptEvent.set(null);

    try {
      await event.prompt();
    } catch {
      // El navegador ya no lo acepta —pasa si el oyente instaló por otro lado—.
      // Sin botón, la página vuelve a mostrar las indicaciones a mano.
    }
  }
}

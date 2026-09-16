import { isPlatformBrowser } from '@angular/common';
import {
  DOCUMENT,
  effect,
  inject,
  Injectable,
  InjectionToken,
  OnDestroy,
  PLATFORM_ID,
} from '@angular/core';
import { SwUpdate } from '@angular/service-worker';

import { RadioPlayer } from '../player/radio-player';
import { ToastQueue } from '../toasts/toast-queue';

/** Recargar es un efecto sobre el navegador; detrás de un token se puede probar. */
export const RELOAD_PAGE = new InjectionToken<() => void>('Recargar la página', {
  providedIn: 'root',
  factory: () => {
    const document = inject(DOCUMENT);
    return () => document.location.reload();
  },
});

/** Cada seis horas, para quien deja la emisora puesta todo el día. */
const CHECK_INTERVAL = 6 * 60 * 60 * 1000;

/**
 * Política de actualización de la aplicación instalada.
 *
 * El riesgo de un service worker es justamente este: que la versión vieja se
 * quede pegada en los celulares durante días, o que aplicar la nueva interrumpa
 * lo que el oyente está haciendo. Las reglas son tres:
 *
 *  1. **Nunca mientras suena la emisora.** Recargar corta el audio, y cortar el
 *     audio es lo único que esta página no puede permitirse.
 *  2. **Nunca mientras alguien está mirando.** La nueva versión se aplica cuando
 *     la pestaña queda en segundo plano, así que el cambio es invisible: nadie
 *     ve recargarse la página que está leyendo, ni aparece un aviso que una
 *     persona mayor tendría que interpretar.
 *  3. **Si no hay momento bueno, no se fuerza.** El service worker ya dejó la
 *     versión nueva instalada y la siguiente visita la abrirá sola.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdates implements OnDestroy {
  private readonly updates = inject(SwUpdate);
  private readonly player = inject(RadioPlayer);
  private readonly toasts = inject(ToastQueue);
  private readonly document = inject(DOCUMENT);
  private readonly reload = inject(RELOAD_PAGE);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private updateReady = false;
  private checkTimer?: ReturnType<typeof setInterval>;

  constructor() {
    // Al dejar de sonar puede abrirse la ventana para aplicar la actualización.
    effect(() => {
      this.player.isPlaying();
      this.applyIfSafe();
    });
  }

  start(): void {
    if (!this.isBrowser || !this.updates.isEnabled) return;

    this.updates.versionUpdates.subscribe((event) => {
      if (event.type === 'VERSION_READY') {
        this.updateReady = true;
        this.applyIfSafe();
      }
    });

    // Caché corrupta o versión imposible de servir: aquí sí toca avisar, porque
    // la página puede estar a medias y la recarga no es opcional.
    this.updates.unrecoverable.subscribe(() => {
      this.toasts.show('Estamos recargando la página para arreglar un problema.', 'info');
      this.reload();
    });

    this.document.addEventListener('visibilitychange', this.handleVisibilityChange);

    this.checkTimer = setInterval(() => {
      void this.updates.checkForUpdate().catch(() => {
        // Sin conexión no hay nada que revisar; se reintenta en el próximo ciclo.
      });
    }, CHECK_INTERVAL);
  }

  ngOnDestroy(): void {
    if (this.checkTimer) clearInterval(this.checkTimer);
    this.document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private readonly handleVisibilityChange = (): void => this.applyIfSafe();

  private applyIfSafe(): void {
    if (!this.updateReady) return;
    if (this.player.isPlaying()) return;
    if (this.document.visibilityState !== 'hidden') return;

    this.updateReady = false;
    void this.updates
      .activateUpdate()
      .then(() => this.reload())
      .catch(() => {
        // Si falla la activación, la siguiente visita se llevará la versión nueva.
        this.updateReady = true;
      });
  }
}

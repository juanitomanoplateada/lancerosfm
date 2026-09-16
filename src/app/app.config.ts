import {
  ApplicationConfig,
  inject,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  PreloadAllModules,
  provideRouter,
  withInMemoryScrolling,
  withPreloading,
} from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';

import { routes } from './app.routes';
import { AppUpdates } from './pwa/app-updates';

/**
 * Sin zone.js: en Angular 22 la detección de cambios por señales es la opción
 * por defecto, así que no hace falta declararla.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
      // Las páginas interiores pesan pocos kilobytes. Se traen en segundo plano
      // una vez cargada la portada, así que navegar es instantáneo incluso con
      // mala conexión, que es el caso de buena parte de la audiencia.
      withPreloading(PreloadAllModules),
    ),
    provideClientHydration(withEventReplay()),

    // Con el service worker, la segunda visita abre desde caché sin tocar la red
    // y la emisora sigue accesible con señal intermitente. Se registra cuando la
    // aplicación ya está estable para no competir con el primer render, y nunca
    // en desarrollo.
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
    provideAppInitializer(() => inject(AppUpdates).start()),
  ],
};

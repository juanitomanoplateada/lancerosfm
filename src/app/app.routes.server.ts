import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Todas las rutas se generan como HTML en tiempo de compilación.
 *
 * Es lo que convierte al sitio en algo indexable: Google recibe el contenido
 * escrito en el HTML y no depende de ejecutar JavaScript. Y como el resultado
 * son archivos estáticos, Vercel los sirve sin servidor ni costo por petición.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Prerender,
  },
];

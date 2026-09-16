import { Routes } from '@angular/router';

import { Home } from './pages/home/home';

/**
 * Las URL van en español porque son contenido: las leen los oyentes y las
 * indexan los buscadores. El código, en inglés.
 *
 * La portada va sin carga diferida a propósito: es la página a la que llega casi
 * todo el mundo y no tiene sentido pedir un fragmento aparte para ella.
 */
export const routes: Routes = [
  {
    path: '',
    component: Home,
  },
  {
    path: 'nosotros',
    loadComponent: () => import('./pages/about/about').then((m) => m.About),
  },
  {
    path: 'como-escuchar',
    loadComponent: () => import('./pages/how-to-listen/how-to-listen').then((m) => m.HowToListen),
  },
  {
    path: 'contacto',
    loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
  },
  {
    // Ruta real para que el prerender genere el archivo que Vercel sirve como 404.
    path: '404',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
  {
    // Sin redirección: la URL equivocada se conserva y se muestra el aviso ahí.
    path: '**',
    loadComponent: () => import('./pages/not-found/not-found').then((m) => m.NotFound),
  },
];

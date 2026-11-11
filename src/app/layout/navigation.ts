/**
 * Las secciones del sitio, en el orden en que se ofrecen.
 *
 * Las leen la cabecera —en pantallas anchas— y la fila de pestañas del celular:
 * son la misma navegación dibujada de dos maneras, y de aquí sale que no puedan
 * ofrecer cosas distintas.
 */
export interface NavItem {
  path: string;
  label: string;
  /** La portada solo se marca activa en `/`, no en cualquier ruta que empiece por ahí. */
  exact: boolean;
  /** Trazo del icono en una rejilla de 24 × 24, para las pestañas. */
  icon: string;
}

export const NAVIGATION: readonly NavItem[] = [
  {
    path: '/',
    label: 'Inicio',
    exact: true,
    icon: 'M3 10.5 12 3l9 7.5M5 9v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9',
  },
  {
    path: '/como-escuchar',
    label: 'Cómo escuchar',
    exact: false,
    icon: 'M4 14v-2a8 8 0 0 1 16 0v2M4 14h3v6H6a2 2 0 0 1-2-2zM20 14h-3v6h1a2 2 0 0 0 2-2z',
  },
  {
    path: '/nosotros',
    label: 'Nosotros',
    exact: false,
    icon: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20a6.5 6.5 0 0 1 13 0M16 4.8a3.5 3.5 0 0 1 0 6.4M18.5 14.6A6.5 6.5 0 0 1 21.5 20',
  },
  {
    path: '/contacto',
    label: 'Contacto',
    exact: false,
    icon: 'M21 11.5a8.5 8.5 0 0 1-12.4 7.6L3 20.5l1.5-5.2A8.5 8.5 0 1 1 21 11.5z',
  },
];

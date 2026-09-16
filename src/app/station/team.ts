/**
 * Equipo de la emisora.
 *
 * Va vacío a propósito: aquí se nombran personas reales y no corresponde
 * inventarlas. En cuanto la emisora entregue los nombres y los roles, se
 * agregan aquí y la sección aparece sola en «Nosotros».
 *
 * Ejemplo de una entrada:
 *   { name: 'Nombre Apellido', role: 'Locución de la mañana' }
 */
export interface TeamMember {
  name: string;
  role: string;
  /** Una o dos frases; opcional. */
  bio?: string;
  /** Ruta dentro de /img, sin dominio. */
  photo?: string;
}

export const TEAM: readonly TeamMember[] = [];

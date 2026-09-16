/** Estados posibles del reproductor. La interfaz se deriva de aquí. */
export type PlayerState = 'stopped' | 'loading' | 'playing' | 'reconnecting' | 'error';

/** Canción al aire, ya separada en sus dos partes. */
export interface Track {
  /** Vacío cuando el metadato no trae el separador « - ». */
  artist: string;
  title: string;
}

/** Lo que llega por el canal SSE de Zeno. */
export interface StreamMetadata {
  streamTitle?: string;
}

/**
 * La automatización rellena el campo de artista con estos valores cuando no hay
 * uno de verdad — pasa con las cuñas y los avisos de la comunidad.
 */
const PLACEHOLDER_ARTIST = /^(\[?unknown\]?|desconocido|n\/?a|-{1,2})$/i;

/**
 * Parte «Artista - Canción» en dos campos.
 * El primer « - » separa; los demás pertenecen al título («Ojos Azules - En Vivo»).
 */
export function parseTrack(raw: string): Track {
  const separator = raw.indexOf(' - ');
  if (separator === -1) {
    return { artist: '', title: raw.trim() };
  }

  const artist = raw.slice(0, separator).trim();
  return {
    artist: PLACEHOLDER_ARTIST.test(artist) ? '' : artist,
    title: raw.slice(separator + 3).trim(),
  };
}

/** Estados posibles del reproductor. La interfaz se deriva de aquí. */
export type PlayerState = 'stopped' | 'loading' | 'playing' | 'reconnecting' | 'error';

/** Canción al aire, ya separada en sus dos partes. */
export interface Track {
  /** Vacío cuando el metadato no trae el separador « - ». */
  artist: string;
  title: string;
}

/** Canción que ya pasó, con el momento en que empezó a sonar. */
export interface PlayedTrack extends Track {
  /** Milisegundos desde la época, como `Date.now()`. */
  startedAt: number;
}

/** Lo que llega por el canal SSE de Zeno. */
export interface StreamMetadata {
  streamTitle?: string;
}

/**
 * La automatización rellena el campo de artista con estos valores cuando no hay
 * uno de verdad — pasa con las cuñas, los avisos de la comunidad y los bloques
 * de programa. Las promociones llegan marcadas con «PROMOCION» en ese campo: no
 * son canciones y no se pueden pedir.
 */
const PLACEHOLDER_ARTIST = /^(\[?unknown\]?|artist|desconocido|n\/?a|-{1,2}|promoci[oó]n)$/i;

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

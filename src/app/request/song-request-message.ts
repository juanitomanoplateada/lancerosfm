import { STATION } from '../station/station';

/** Lo que el oyente quiere que suene. Solo cuenta lo que haya llenado. */
export interface SongRequestDetails {
  song?: string;
  /** A quién va dedicado el saludo. */
  greetingFor?: string;
  /** Quién lo manda. */
  from?: string;
}

/**
 * Redacta la petición tal como le llega a la emisora por WhatsApp.
 *
 * Con todos los datos queda un mensaje que el locutor puede leer al aire sin
 * tener que preguntar nada. Con ninguno, queda el comienzo de siempre, para que
 * el oyente lo termine en WhatsApp: el botón de enviar funciona igual, se haya
 * llenado lo que se haya llenado.
 */
export function songRequestMessage(details: SongRequestDetails): string {
  const song = tidy(details.song);
  const greetingFor = tidy(details.greetingFor);
  const from = tidy(details.from);

  if (!song && !greetingFor) {
    return from
      ? `Hola, soy ${from}. Quiero solicitar la canción: `
      : STATION.contact.whatsappMessage;
  }

  const sentences = song
    ? [`${STATION.contact.whatsappMessage}${song}.`]
    : [`Hola, quiero mandar un saludo para ${greetingFor}.`];

  if (song && greetingFor) sentences.push(`Con un saludo para ${greetingFor}.`);
  if (from) sentences.push(`De parte de ${from}.`);

  return sentences.join(' ');
}

/** Lo que sobra al final de lo que escribe el oyente: un espacio o un punto. */
const SPACE_OR_DOT = /[\s.]/;

/** Sin espacios de sobra ni el punto final, que ya lo pone el mensaje. */
function tidy(value = ''): string {
  const text = value.trim();

  // Se recorre desde el final en lugar de usar /[\s.]+$/: esa expresión prueba
  // cada posición de una tira de espacios o puntos y, si detrás hay más texto,
  // tarda un tiempo cuadrático.
  let end = text.length;
  while (end > 0 && SPACE_OR_DOT.test(text[end - 1])) end -= 1;

  return text.slice(0, end);
}

/**
 * Datos de la emisora: única fuente de verdad para toda la aplicación.
 *
 * Antes estos valores estaban repartidos entre `environment.ts`, una función
 * serverless y varias plantillas. Ahora se editan aquí y punto.
 *
 * Sobre las URL del stream: son fijas y públicas — el navegador de cada oyente
 * las necesita para reproducir, así que no son un secreto. La URL corta de Zeno
 * redirige a un servidor con token firmado y renovado en cada petición, de modo
 * que nunca caduca. (La versión anterior guardaba un token ya vencido.)
 */
export const STATION = {
  name: 'Lanceros Stereo',
  frequency: '94.1 FM',
  fullName: 'Lanceros Stereo 94.1 FM',
  tagline: 'Dios, vida y alegría',
  motto: 'Sintonizados con el progreso',
  slogan: 'De ruana por Boyacá',

  // Tiene que ser el dominio principal de Vercel, el único que no redirige. Si
  // cambia, hay que cambiarlo también en `public/sitemap.xml` y
  // `public/robots.txt`, que no leen este valor.
  origin: 'https://www.lancerosfm.com',

  stream: {
    audio: 'https://stream.zeno.fm/jz1bfxan45kuv',
    metadata: 'https://api.zeno.fm/mounts/metadata/subscribe/jz1bfxan45kuv',
  },

  address: {
    street: 'Calle 4 # 5-93',
    city: 'Tuta',
    region: 'Boyacá',
    postalCode: '150401',
    country: 'CO',
    countryName: 'Colombia',
    // Las del pin de la emisora en Google Maps (el mismo de `mapsUrl`), no las
    // del centro del municipio: son las que cruza Google para la búsqueda local.
    latitude: 5.6892,
    longitude: -73.22803,
    mapsUrl: 'https://maps.app.goo.gl/fZg7bTQHtSB2Tu9c6',
  },

  contact: {
    phone: '+573102688737',
    phoneDisplay: '310 268 8737',
    email: 'radiolanceros@hotmail.com',
    whatsapp: '573102688737',
    whatsappMessage: 'Hola, quiero solicitar la canción: ',
  },

  social: {
    facebook: 'https://www.facebook.com/LancerosStereo',
    instagram: 'https://www.instagram.com/rlan.ceros941/',
    tiktok: 'https://www.tiktok.com/@94.1lanceros',
  },
} as const;

/** Enlace de WhatsApp con el mensaje de petición ya escrito. */
export const WHATSAPP_URL = `https://wa.me/${STATION.contact.whatsapp}?text=${encodeURIComponent(
  STATION.contact.whatsappMessage,
)}`;

/** Lista plana para `sameAs` de los datos estructurados. */
export const SOCIAL_PROFILES: readonly string[] = Object.values(STATION.social);

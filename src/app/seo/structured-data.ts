import { SOCIAL_PROFILES, STATION } from '../station/station';

/**
 * Datos estructurados (JSON-LD).
 *
 * Es lo que le permite a Google entender que esto es una emisora de radio de un
 * municipio concreto, y no una página cualquiera: de ahí salen la ficha del
 * buscador, la aparición en el mapa y los resultados de búsqueda local.
 */

type Schema = Record<string, unknown>;

const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: STATION.address.street,
  addressLocality: STATION.address.city,
  addressRegion: STATION.address.region,
  postalCode: STATION.address.postalCode,
  addressCountry: STATION.address.country,
};

export function radioStationSchema(): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'RadioStation',
    '@id': `${STATION.origin}/#station`,
    name: STATION.fullName,
    alternateName: [STATION.name, `${STATION.name} ${STATION.frequency}`],
    slogan: `${STATION.tagline}. ${STATION.motto}.`,
    description: `Emisora comunitaria de ${STATION.address.city}, ${STATION.address.region}. Transmite en ${STATION.frequency} y en vivo por internet las 24 horas.`,
    url: STATION.origin,
    logo: `${STATION.origin}/img/icon-512.png`,
    image: `${STATION.origin}/img/og-banner.jpg`,
    telephone: STATION.contact.phone,
    email: STATION.contact.email,
    address: ADDRESS,
    geo: {
      '@type': 'GeoCoordinates',
      latitude: STATION.address.latitude,
      longitude: STATION.address.longitude,
    },
    hasMap: STATION.address.mapsUrl,
    areaServed: {
      '@type': 'AdministrativeArea',
      name: `${STATION.address.city}, ${STATION.address.region}, ${STATION.address.countryName}`,
    },
    broadcastFrequency: {
      '@type': 'BroadcastFrequencySpecification',
      broadcastFrequencyValue: 94.1,
      broadcastSignalModulation: 'FM',
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      opens: '00:00',
      closes: '23:59',
    },
    sameAs: SOCIAL_PROFILES,
    potentialAction: {
      '@type': 'ListenAction',
      target: STATION.origin,
    },
  };
}

export function webSiteSchema(): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${STATION.origin}/#website`,
    name: STATION.fullName,
    url: STATION.origin,
    inLanguage: 'es-CO',
    publisher: { '@id': `${STATION.origin}/#station` },
  };
}

export function breadcrumbSchema(items: readonly { name: string; path: string }[]): Schema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${STATION.origin}${item.path}`,
    })),
  };
}

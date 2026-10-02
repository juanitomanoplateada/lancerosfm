import { describe, expect, it } from 'vitest';

import { SOCIAL_PROFILES } from '../station/station';
import { breadcrumbSchema, radioStationSchema, webSiteSchema } from './structured-data';

describe('datos estructurados', () => {
  describe('radioStationSchema', () => {
    const schema = radioStationSchema();

    it('describe una emisora de radio con identidad propia', () => {
      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('RadioStation');
      expect(schema['@id']).toBe('https://www.lancerosfm.com/#station');
      expect(schema['name']).toBe('Lanceros Stereo 94.1 FM');
    });

    it('trae la dirección y las coordenadas que usa la búsqueda local', () => {
      expect(schema['address']).toEqual({
        '@type': 'PostalAddress',
        streetAddress: 'Calle 4 # 5-93',
        addressLocality: 'Tuta',
        addressRegion: 'Boyacá',
        postalCode: '150401',
        addressCountry: 'CO',
      });
      expect(schema['geo']).toEqual({
        '@type': 'GeoCoordinates',
        latitude: 5.6892,
        longitude: -73.22803,
      });
    });

    it('declara la frecuencia y la emisión continua', () => {
      expect(schema['broadcastFrequency']).toEqual(
        expect.objectContaining({ broadcastFrequencyValue: 94.1, broadcastSignalModulation: 'FM' }),
      );
      expect(schema['openingHoursSpecification']).toEqual(
        expect.objectContaining({ opens: '00:00', closes: '23:59' }),
      );
    });

    it('enlaza todas las redes sociales', () => {
      expect(schema['sameAs']).toEqual(SOCIAL_PROFILES);
      expect(SOCIAL_PROFILES).toHaveLength(3);
    });

    it('usa direcciones absolutas para el logo y la imagen', () => {
      expect(schema['logo']).toBe('https://www.lancerosfm.com/img/icon-512.png');
      expect(schema['image']).toBe('https://www.lancerosfm.com/img/og-banner.jpg');
    });
  });

  describe('webSiteSchema', () => {
    it('presenta el sitio en español de Colombia, publicado por la emisora', () => {
      expect(webSiteSchema()).toEqual({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        '@id': 'https://www.lancerosfm.com/#website',
        name: 'Lanceros Stereo 94.1 FM',
        url: 'https://www.lancerosfm.com',
        inLanguage: 'es-CO',
        publisher: { '@id': 'https://www.lancerosfm.com/#station' },
      });
    });
  });

  describe('breadcrumbSchema', () => {
    it('numera la ruta desde uno y la vuelve absoluta', () => {
      const schema = breadcrumbSchema([
        { name: 'Inicio', path: '/' },
        { name: 'Contacto', path: '/contacto' },
      ]);

      expect(schema['@type']).toBe('BreadcrumbList');
      expect(schema['itemListElement']).toEqual([
        { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://www.lancerosfm.com/' },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Contacto',
          item: 'https://www.lancerosfm.com/contacto',
        },
      ]);
    });
  });
});

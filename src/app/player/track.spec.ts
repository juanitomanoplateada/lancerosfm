import { describe, expect, it } from 'vitest';

import { parseTrack } from './track';

describe('parseTrack', () => {
  it('separa artista y canción por el primer guion', () => {
    expect(parseTrack('Los Hispanos - Boquita de caramelo')).toEqual({
      artist: 'Los Hispanos',
      title: 'Boquita de caramelo',
    });
  });

  it('deja los guiones siguientes dentro del título', () => {
    expect(parseTrack('Darío Gómez - Nadie es eterno - En vivo')).toEqual({
      artist: 'Darío Gómez',
      title: 'Nadie es eterno - En vivo',
    });
  });

  it('trata el texto completo como título cuando no hay separador', () => {
    expect(parseTrack('Lanceros Stereo 94.1 FM')).toEqual({
      artist: '',
      title: 'Lanceros Stereo 94.1 FM',
    });
  });

  it('no confunde un guion sin espacios con el separador', () => {
    expect(parseTrack('Bomba Estéreo - Soy Yo-Remix')).toEqual({
      artist: 'Bomba Estéreo',
      title: 'Soy Yo-Remix',
    });
  });

  it('descarta el artista de relleno que pone la automatización', () => {
    expect(parseTrack('[Unknown] - 15.00 AM').artist).toBe('');
    expect(parseTrack('Unknown - Cuña institucional').artist).toBe('');
    expect(parseTrack('- - Aviso de la comunidad').artist).toBe('');
  });

  it('conserva los avisos con emisor real', () => {
    expect(parseTrack('ESE SAN MIGUEL TUTA - 22 HORARIOS DE ATENCIÓN')).toEqual({
      artist: 'ESE SAN MIGUEL TUTA',
      title: '22 HORARIOS DE ATENCIÓN',
    });
  });

  it('recorta los espacios sobrantes', () => {
    expect(parseTrack('  Binomio de Oro   -   Momentos  ')).toEqual({
      artist: 'Binomio de Oro',
      title: 'Momentos',
    });
  });
});

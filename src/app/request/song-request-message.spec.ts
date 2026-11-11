import { describe, expect, it } from 'vitest';

import { songRequestMessage } from './song-request-message';

describe('songRequestMessage', () => {
  it('con todos los datos queda listo para leerlo al aire', () => {
    expect(
      songRequestMessage({
        song: 'Los caminos de la vida',
        greetingFor: 'mi mamá',
        from: 'Edwin',
      }),
    ).toBe(
      'Hola, quiero solicitar la canción: Los caminos de la vida. Con un saludo para mi mamá. De parte de Edwin.',
    );
  });

  it('con solo la canción, pide solo la canción', () => {
    expect(songRequestMessage({ song: 'Ay hombe' })).toBe(
      'Hola, quiero solicitar la canción: Ay hombe.',
    );
  });

  it('firma la petición aunque no lleve saludo', () => {
    expect(songRequestMessage({ song: 'Ay hombe', from: 'Edwin' })).toBe(
      'Hola, quiero solicitar la canción: Ay hombe. De parte de Edwin.',
    );
  });

  it('sirve para mandar un saludo sin canción', () => {
    expect(songRequestMessage({ greetingFor: 'mis tíos en Bogotá', from: 'Edwin' })).toBe(
      'Hola, quiero mandar un saludo para mis tíos en Bogotá. De parte de Edwin.',
    );
    expect(songRequestMessage({ greetingFor: 'mi mamá' })).toBe(
      'Hola, quiero mandar un saludo para mi mamá.',
    );
  });

  it('sin nada escrito deja el comienzo de siempre, para terminarlo en WhatsApp', () => {
    expect(songRequestMessage({})).toBe('Hola, quiero solicitar la canción: ');
    expect(songRequestMessage({ song: '   ', greetingFor: '', from: ' ' })).toBe(
      'Hola, quiero solicitar la canción: ',
    );
  });

  it('con solo el nombre, presenta a quien escribe y deja la canción por decir', () => {
    expect(songRequestMessage({ from: 'Edwin' })).toBe(
      'Hola, soy Edwin. Quiero solicitar la canción: ',
    );
  });

  it('quita los espacios de sobra y el punto final, que ya lo pone el mensaje', () => {
    expect(songRequestMessage({ song: '  Ay hombe. ', greetingFor: ' mi mamá.. ' })).toBe(
      'Hola, quiero solicitar la canción: Ay hombe. Con un saludo para mi mamá.',
    );
  });
});

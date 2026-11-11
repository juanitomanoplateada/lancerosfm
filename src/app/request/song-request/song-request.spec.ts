import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { WHATSAPP_URL } from '../../station/station';
import { SongRequest } from './song-request';

describe('SongRequest', () => {
  let fixture: ComponentFixture<SongRequest>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function send(): HTMLAnchorElement {
    return host().querySelector<HTMLAnchorElement>('a.request__send')!;
  }

  /** El mensaje que le llegaría a la emisora si el oyente tocara «Enviar» ahora. */
  function message(): string | null {
    return new URL(send().href).searchParams.get('text');
  }

  async function write(fieldId: string, value: string): Promise<void> {
    const field = host().querySelector<HTMLInputElement>(`#${fieldId}`)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(SongRequest);
    fixture.autoDetectChanges();
  });

  it('cada campo tiene su pregunta como etiqueta', () => {
    const labels = [...host().querySelectorAll('label')].map((label) => [
      label.getAttribute('for'),
      label.textContent?.replace(/\s+/g, ' ').trim(),
    ]);

    expect(labels).toEqual([
      ['request-song', '¿Qué canción quieres oír?'],
      ['request-greeting', '¿Para quién es el saludo? (si quieres)'],
      ['request-from', '¿De parte de quién? (si quieres)'],
    ]);
    for (const [id] of labels) expect(host().querySelector(`#${id}`)).not.toBeNull();
  });

  it('sin llenar nada, el botón ya lleva al WhatsApp de la emisora', () => {
    expect(send().href).toBe(WHATSAPP_URL);
    expect(send().target).toBe('_blank');
    expect(send().rel).toContain('noopener');
  });

  it('va armando el mensaje con lo que el oyente escribe', async () => {
    await write('request-song', 'Los caminos de la vida');
    expect(message()).toBe('Hola, quiero solicitar la canción: Los caminos de la vida.');

    await write('request-greeting', 'mi mamá');
    await write('request-from', 'Edwin');

    expect(message()).toBe(
      'Hola, quiero solicitar la canción: Los caminos de la vida. Con un saludo para mi mamá. De parte de Edwin.',
    );
    expect(send().href).toContain('https://wa.me/573102688737');
  });

  it('deja que el teléfono proponga el nombre del oyente, y nada más', () => {
    const autocomplete = (id: string) =>
      host().querySelector(`#${id}`)?.getAttribute('autocomplete');

    expect(autocomplete('request-from')).toBe('name');
    expect(autocomplete('request-song')).toBe('off');
    expect(autocomplete('request-greeting')).toBe('off');
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { PageHeader } from './page-header';

describe('PageHeader', () => {
  let fixture: ComponentFixture<PageHeader>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(PageHeader);
    fixture.componentRef.setInput('eyebrow', 'Hablemos');
    fixture.componentRef.setInput('title', 'Contacto de Lanceros Stereo');
  });

  it('pinta el antetítulo y el título como encabezado principal', () => {
    fixture.detectChanges();

    expect(host().querySelector('.page-header__eyebrow')?.textContent).toBe('Hablemos');
    expect(host().querySelector('h1')?.textContent).toBe('Contacto de Lanceros Stereo');
  });

  it('omite la entradilla cuando no la hay', () => {
    fixture.detectChanges();

    expect(host().querySelector('.page-header__lead')).toBeNull();
  });

  it('muestra la entradilla cuando la hay', () => {
    fixture.componentRef.setInput('lead', 'Para pedir una canción.');
    fixture.detectChanges();

    expect(host().querySelector('.page-header__lead')?.textContent).toBe('Para pedir una canción.');
  });
});

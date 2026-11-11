import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { WHATSAPP_URL } from '../../station/station';
import { FloatingContact } from './floating-contact';

@Component({ template: '' })
class BlankPage {}

describe('FloatingContact', () => {
  let fixture: ComponentFixture<FloatingContact>;
  let router: Router;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function toggleButton(): HTMLButtonElement {
    return host().querySelector<HTMLButtonElement>('.contact__toggle')!;
  }

  function list(): HTMLElement {
    return host().querySelector<HTMLElement>('#quick-contact')!;
  }

  async function navigate(url: string): Promise<void> {
    await router.navigateByUrl(url);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    });
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(FloatingContact);
    fixture.autoDetectChanges();
    await navigate('/nosotros');
  });

  describe('dónde aparece', () => {
    it('no aparece en la portada, donde estorbaría al botón de reproducir', async () => {
      await navigate('/');

      expect(host().querySelector('.contact')).toBeNull();
    });

    it('tampoco en la portada abierta desde el atajo de la aplicación', async () => {
      await navigate('/?play=1');
      expect(host().querySelector('.contact')).toBeNull();

      await navigate('/#contenido');
      expect(host().querySelector('.contact')).toBeNull();
    });

    it('tampoco en la de contacto, que ya tiene escrito todo lo que ofrece el menú', async () => {
      await navigate('/contacto');

      expect(host().querySelector('.contact')).toBeNull();
    });

    it('aparece en las demás páginas interiores', async () => {
      await navigate('/como-escuchar?origen=menu#preguntas');

      expect(host().querySelector('.contact')).not.toBeNull();
    });
  });

  describe('menú', () => {
    it('arranca cerrado e inaccesible para el teclado', () => {
      expect(list().classList).not.toContain('is-open');
      expect(list().hasAttribute('inert')).toBe(true);
      expect(toggleButton().getAttribute('aria-expanded')).toBe('false');
      expect(toggleButton().getAttribute('aria-label')).toBe('Abrir contacto rápido');
    });

    it('se abre y se cierra con el botón', async () => {
      toggleButton().click();
      await fixture.whenStable();

      expect(list().classList).toContain('is-open');
      expect(list().hasAttribute('inert')).toBe(false);
      expect(toggleButton().getAttribute('aria-expanded')).toBe('true');
      expect(toggleButton().getAttribute('aria-label')).toBe('Cerrar contacto rápido');

      toggleButton().click();
      await fixture.whenStable();

      expect(list().classList).not.toContain('is-open');
    });

    it('se cierra con Escape', async () => {
      toggleButton().click();
      await fixture.whenStable();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await fixture.whenStable();

      expect(list().classList).not.toContain('is-open');
    });

    it('se cierra al elegir una opción', async () => {
      toggleButton().click();
      await fixture.whenStable();

      const whatsapp = list().querySelector<HTMLAnchorElement>('.contact__item--whatsapp')!;
      expect(whatsapp.href).toBe(WHATSAPP_URL);

      // jsdom no navega: se evita que lo intente y avise por consola.
      list().addEventListener('click', (event) => event.preventDefault());
      whatsapp.click();
      await fixture.whenStable();

      expect(list().classList).not.toContain('is-open');
    });

    it('ofrece llamar, escribir y llegar a la emisora', () => {
      const hrefs = [...list().querySelectorAll('a')].map((link) => link.getAttribute('href'));

      expect(hrefs).toEqual([
        WHATSAPP_URL,
        'tel:+573102688737',
        'mailto:radiolanceros@hotmail.com',
        'https://maps.app.goo.gl/fZg7bTQHtSB2Tu9c6',
      ]);
    });
  });
});

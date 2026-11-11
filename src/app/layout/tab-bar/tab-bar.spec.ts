import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { beforeEach, describe, expect, it } from 'vitest';

import { TabBar } from './tab-bar';

@Component({ template: '' })
class BlankPage {}

describe('TabBar', () => {
  let fixture: ComponentFixture<TabBar>;

  function tabs(): HTMLAnchorElement[] {
    return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('a')];
  }

  function currentTab(): string | undefined {
    return tabs()
      .find((tab) => tab.getAttribute('aria-current') === 'page')
      ?.textContent?.trim();
  }

  async function navigate(url: string): Promise<void> {
    await TestBed.inject(Router).navigateByUrl(url);
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: BlankPage }])],
    });
    fixture = TestBed.createComponent(TabBar);
    fixture.autoDetectChanges();
  });

  it('ofrece las mismas cuatro secciones que la cabecera, cada una con su rótulo', () => {
    expect(tabs().map((tab) => [tab.getAttribute('href'), tab.textContent?.trim()])).toEqual([
      ['/', 'Inicio'],
      ['/como-escuchar', 'Cómo escuchar'],
      ['/nosotros', 'Nosotros'],
      ['/contacto', 'Contacto'],
    ]);
  });

  it('es la navegación principal y sus iconos son solo adorno', () => {
    const nav = (fixture.nativeElement as HTMLElement).querySelector('nav');

    expect(nav?.getAttribute('aria-label')).toBe('Navegación principal');
    for (const tab of tabs()) {
      expect(tab.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
      expect(tab.querySelector('path')?.getAttribute('d')).toBeTruthy();
    }
  });

  it('marca la pestaña de la página en la que está el oyente', async () => {
    await navigate('/nosotros');
    expect(currentTab()).toBe('Nosotros');

    await navigate('/contacto');
    expect(currentTab()).toBe('Contacto');
  });

  it('solo marca «Inicio» en la portada, no en cualquier otra página', async () => {
    await navigate('/');
    expect(currentTab()).toBe('Inicio');

    await navigate('/como-escuchar');
    expect(currentTab()).toBe('Cómo escuchar');
  });
});

import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AppInstall } from '../app-install';
import { InstallApp } from './install-app';

/** Doble del servicio: la prueba decide en qué dispositivo está el oyente. */
class FakeAppInstall {
  readonly canPrompt = signal(false);
  readonly isInstalled = signal(false);
  readonly isAppleMobile = signal(false);
  readonly install = vi.fn(() => Promise.resolve());
}

describe('InstallApp', () => {
  let appInstall: FakeAppInstall;
  let fixture: ComponentFixture<InstallApp>;

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent!.replace(/\s+/g, ' ').trim();
  }

  function button(): HTMLButtonElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('button');
  }

  beforeEach(() => {
    appInstall = new FakeAppInstall();
    TestBed.configureTestingModule({ providers: [{ provide: AppInstall, useValue: appInstall }] });
    fixture = TestBed.createComponent(InstallApp);
    fixture.autoDetectChanges();
  });

  it('da las indicaciones generales cuando no sabe nada mejor, como en el prerender', () => {
    expect(text()).toContain('«Agregar a la pantalla de inicio»');
    expect(text()).toContain('«Instalar aplicación»');
    expect(button()).toBeNull();
  });

  it('ofrece instalar de un toque donde el navegador lo permite', async () => {
    appInstall.canPrompt.set(true);
    await fixture.whenStable();

    expect(button()?.textContent).toContain('Instalar la aplicación');

    button()!.click();
    expect(appInstall.install).toHaveBeenCalledTimes(1);
  });

  it('explica los tres pasos del iPhone, que no tiene botón', async () => {
    appInstall.isAppleMobile.set(true);
    await fixture.whenStable();

    const steps = [...(fixture.nativeElement as HTMLElement).querySelectorAll('ol > li')].map(
      (step) => step.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(steps).toEqual([
      'Toca Compartir, en la barra del navegador.',
      'Baja por la lista y elige «Agregar a inicio».',
      'Toca «Agregar», arriba a la derecha.',
    ]);
    expect(button()).toBeNull();
  });

  it('no insiste cuando la emisora ya está instalada', async () => {
    appInstall.isInstalled.set(true);
    appInstall.canPrompt.set(true);
    await fixture.whenStable();

    expect(text()).toBe('Ya tienes la emisora instalada en este dispositivo.');
    expect(button()).toBeNull();
  });
});

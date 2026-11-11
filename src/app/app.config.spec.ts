import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { describe, expect, it, vi } from 'vitest';

import { appConfig } from './app.config';
import { AppInstall } from './pwa/app-install';
import { AppUpdates } from './pwa/app-updates';

describe('appConfig', () => {
  it('pone en marcha la política de actualizaciones al arrancar', async () => {
    const start = vi.fn();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, { provide: AppUpdates, useValue: { start } }],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(start).toHaveBeenCalledTimes(1);
  });

  it('empieza a escuchar el aviso de instalación desde el arranque', async () => {
    const listen = vi.fn();
    TestBed.configureTestingModule({
      providers: [...appConfig.providers, { provide: AppInstall, useValue: { listen } }],
    });

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(listen).toHaveBeenCalledTimes(1);
  });

  it('no registra el service worker en desarrollo', () => {
    TestBed.configureTestingModule({ providers: appConfig.providers });

    expect(TestBed.inject(SwUpdate).isEnabled).toBe(false);
  });
});

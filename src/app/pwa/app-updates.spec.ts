import { DOCUMENT, signal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import { RadioPlayer } from '../player/radio-player';
import { ToastQueue } from '../toasts/toast-queue';
import { AppUpdates, RELOAD_PAGE } from './app-updates';

/** Doble de SwUpdate: permite emitir los eventos de versión a mano. */
class FakeSwUpdate {
  isEnabled = true;
  readonly versionUpdates = new Subject<VersionEvent>();
  readonly unrecoverable = new Subject<{ reason: string }>();
  readonly activateUpdate = vi.fn(() => Promise.resolve(true));
  readonly checkForUpdate = vi.fn(() => Promise.resolve(true));

  announceVersionReady(): void {
    this.versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'anterior' },
      latestVersion: { hash: 'nueva' },
    });
  }
}

function createFakeDocument() {
  const listeners = new Map<string, () => void>();
  return {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (type: string, handler: () => void) => void listeners.set(type, handler),
    removeEventListener: (type: string) => void listeners.delete(type),
    location: { reload: vi.fn() },
    /** Simula que el oyente cambia de pestaña o bloquea el teléfono. */
    hide() {
      this.visibilityState = 'hidden';
      listeners.get('visibilitychange')?.();
    },
  };
}

function configure(options: {
  updates: FakeSwUpdate;
  document: ReturnType<typeof createFakeDocument>;
  reload: () => void;
  playing: WritableSignal<boolean>;
}): AppUpdates {
  TestBed.configureTestingModule({
    providers: [
      { provide: SwUpdate, useValue: options.updates },
      { provide: DOCUMENT, useValue: options.document },
      { provide: RELOAD_PAGE, useValue: options.reload },
      { provide: RadioPlayer, useValue: { isPlaying: options.playing } },
    ],
  });
  const appUpdates = TestBed.inject(AppUpdates);
  appUpdates.start();
  return appUpdates;
}

describe('AppUpdates', () => {
  let updates: FakeSwUpdate;
  let fakeDocument: ReturnType<typeof createFakeDocument>;
  let reload: Mock<() => void>;
  let playing: WritableSignal<boolean>;

  beforeEach(() => {
    updates = new FakeSwUpdate();
    fakeDocument = createFakeDocument();
    reload = vi.fn<() => void>();
    playing = signal(false);
    configure({ updates, document: fakeDocument, reload, playing });
  });

  it('no aplica nada mientras no haya versión nueva', () => {
    fakeDocument.hide();
    expect(reload).not.toHaveBeenCalled();
  });

  it('espera a que la pestaña quede en segundo plano', () => {
    updates.announceVersionReady();

    // La pestaña sigue a la vista: nadie debe ver recargarse la página.
    expect(reload).not.toHaveBeenCalled();

    fakeDocument.hide();
    expect(updates.activateUpdate).toHaveBeenCalled();
  });

  it('no interrumpe la emisora aunque la pestaña esté oculta', async () => {
    playing.set(true);
    TestBed.tick();

    updates.announceVersionReady();
    fakeDocument.hide();
    await Promise.resolve();

    expect(updates.activateUpdate).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('aprovecha el momento en que el oyente detiene la emisora', async () => {
    playing.set(true);
    TestBed.tick();
    updates.announceVersionReady();
    fakeDocument.hide();
    expect(updates.activateUpdate).not.toHaveBeenCalled();

    playing.set(false);
    TestBed.tick();
    await Promise.resolve();

    expect(updates.activateUpdate).toHaveBeenCalled();
  });

  it('recarga tras activar la versión nueva', async () => {
    updates.announceVersionReady();
    fakeDocument.hide();
    await Promise.resolve();

    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('avisa y recarga si la caché queda irrecuperable', () => {
    const toasts = TestBed.inject(ToastQueue);

    updates.unrecoverable.next({ reason: 'caché corrupta' });

    expect(reload).toHaveBeenCalled();
    expect(toasts.toasts()).toHaveLength(1);
  });

  it('no hace nada cuando el service worker está desactivado', () => {
    TestBed.resetTestingModule();
    const disabled = new FakeSwUpdate();
    disabled.isEnabled = false;
    const otherDocument = createFakeDocument();
    const otherReload = vi.fn<() => void>();

    configure({
      updates: disabled,
      document: otherDocument,
      reload: otherReload,
      playing: signal(false),
    });

    disabled.announceVersionReady();
    otherDocument.hide();

    expect(disabled.activateUpdate).not.toHaveBeenCalled();
    expect(otherReload).not.toHaveBeenCalled();
  });

  it('ignora los demás avisos del service worker', () => {
    updates.versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'nueva' } });
    fakeDocument.hide();

    expect(updates.activateUpdate).not.toHaveBeenCalled();
  });

  it('si falla la activación, lo intenta de nuevo la próxima vez que se oculte', async () => {
    updates.activateUpdate.mockRejectedValueOnce(new Error('caché ocupada'));
    updates.announceVersionReady();
    fakeDocument.hide();
    await vi.waitFor(() => expect(updates.activateUpdate).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(reload).not.toHaveBeenCalled();

    fakeDocument.hide();
    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(updates.activateUpdate).toHaveBeenCalledTimes(2);
  });

  describe('revisión periódica', () => {
    const SIX_HOURS = 6 * 60 * 60 * 1000;

    beforeEach(() => {
      // El servicio del bloque exterior ya arrancó con temporizadores reales;
      // este necesita los falsos desde antes de `start()`.
      TestBed.resetTestingModule();
      vi.useFakeTimers();
      updates = new FakeSwUpdate();
      configure({ updates, document: createFakeDocument(), reload, playing });
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('busca una versión nueva cada seis horas', () => {
      vi.advanceTimersByTime(SIX_HOURS - 1);
      expect(updates.checkForUpdate).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1);
      expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(SIX_HOURS);
      expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('no se cae si la revisión falla por falta de conexión', async () => {
      updates.checkForUpdate.mockRejectedValueOnce(new Error('sin conexión'));

      await vi.advanceTimersByTimeAsync(SIX_HOURS);
      expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(SIX_HOURS);
      expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
    });

    it('deja de revisar cuando se destruye la aplicación', () => {
      TestBed.resetTestingModule();

      vi.advanceTimersByTime(SIX_HOURS * 2);

      expect(updates.checkForUpdate).not.toHaveBeenCalled();
    });
  });
});

describe('RELOAD_PAGE', () => {
  it('recarga el documento de la aplicación', () => {
    const location = { reload: vi.fn() };
    TestBed.configureTestingModule({
      providers: [{ provide: DOCUMENT, useValue: { location } }],
    });

    TestBed.inject(RELOAD_PAGE)();

    expect(location.reload).toHaveBeenCalledTimes(1);
  });
});

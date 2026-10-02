import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastQueue } from './toast-queue';

describe('ToastQueue', () => {
  let queue: ToastQueue;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    queue = TestBed.inject(ToastQueue);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('empieza sin avisos', () => {
    expect(queue.toasts()).toEqual([]);
  });

  it('encola varios avisos a la vez', () => {
    queue.show('Primero', 'info');
    queue.show('Segundo', 'error');

    expect(queue.toasts().map((toast) => toast.message)).toEqual(['Primero', 'Segundo']);
  });

  it('no repite un aviso que ya está en pantalla', () => {
    queue.show('Sin conexión', 'error');
    queue.show('Sin conexión', 'error');

    expect(queue.toasts()).toHaveLength(1);
  });

  it('retira cada aviso al cumplirse su propio tiempo', () => {
    queue.show('Corto', 'info', 1_000);
    queue.show('Largo', 'info', 5_000);

    vi.advanceTimersByTime(1_000);
    expect(queue.toasts().map((toast) => toast.message)).toEqual(['Largo']);

    vi.advanceTimersByTime(4_000);
    expect(queue.toasts()).toEqual([]);
  });

  it('cancela el temporizador cuando se cierra a mano', () => {
    queue.show('Aviso', 'info', 5_000);
    const [{ id }] = queue.toasts();

    queue.dismiss(id);
    expect(queue.toasts()).toEqual([]);

    // Si el temporizador siguiera vivo, aquí intentaría retirar un aviso que ya
    // no existe. La prueba falla si eso lanza o si reaparece algo.
    vi.advanceTimersByTime(10_000);
    expect(queue.toasts()).toEqual([]);
  });

  it('cancela los temporizadores pendientes al destruirse', () => {
    queue.show('Primero', 'info', 5_000);
    queue.show('Segundo', 'info', 5_000);
    expect(vi.getTimerCount()).toBe(2);

    TestBed.resetTestingModule();

    expect(vi.getTimerCount()).toBe(0);
  });

  describe('durante el prerender', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
      queue = TestBed.inject(ToastQueue);
    });

    it('no programa temporizadores: nadie está mirando el HTML que se genera', () => {
      queue.show('Aviso', 'info', 1_000);

      vi.advanceTimersByTime(10_000);

      expect(queue.toasts()).toHaveLength(1);
    });

    it('permite cerrar un aviso que no tiene temporizador', () => {
      queue.show('Aviso');
      const [{ id }] = queue.toasts();

      queue.dismiss(id);

      expect(queue.toasts()).toEqual([]);
    });
  });
});

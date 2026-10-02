import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { ToastQueue } from '../toast-queue';
import { ToastList } from './toast-list';

describe('ToastList', () => {
  let fixture: ComponentFixture<ToastList>;
  let queue: ToastQueue;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    queue = TestBed.inject(ToastQueue);
    fixture = TestBed.createComponent(ToastList);
    fixture.detectChanges();
  });

  it('anuncia los avisos en una región que leen los lectores de pantalla', () => {
    const region = host().querySelector('output');

    expect(region).not.toBeNull();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.children).toHaveLength(0);
  });

  it('muestra cada aviso con el estilo de su tipo', () => {
    queue.show('Enlace copiado', 'success');
    queue.show('Sin conexión', 'error');
    fixture.detectChanges();

    const toasts = host().querySelectorAll('.toast');
    expect(toasts).toHaveLength(2);
    expect(toasts[0].classList).toContain('toast--success');
    expect(toasts[0].textContent).toContain('Enlace copiado');
    expect(toasts[1].classList).toContain('toast--error');
  });

  it('cierra el aviso con su botón', () => {
    queue.show('Enlace copiado', 'success');
    fixture.detectChanges();

    host().querySelector<HTMLButtonElement>('button[aria-label="Cerrar aviso"]')?.click();
    fixture.detectChanges();

    expect(queue.toasts()).toEqual([]);
    expect(host().querySelectorAll('.toast')).toHaveLength(0);
  });
});

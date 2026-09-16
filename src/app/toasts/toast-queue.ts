import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, OnDestroy, PLATFORM_ID, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const DEFAULT_DURATION = 5_000;

/**
 * Cola de avisos.
 *
 * Cada aviso tiene su propia identidad y su propio temporizador: dos errores
 * seguidos no se pisan, y cerrar uno a mano cancela su cuenta atrás.
 */
@Injectable({ providedIn: 'root' })
export class ToastQueue implements OnDestroy {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private readonly items = signal<readonly Toast[]>([]);
  readonly toasts = this.items.asReadonly();

  private nextId = 1;
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();

  show(message: string, type: ToastType = 'info', duration = DEFAULT_DURATION): void {
    // Un mismo mensaje repetido —reintentos de conexión, por ejemplo— no debe
    // apilar avisos idénticos en pantalla.
    if (this.items().some((toast) => toast.message === message)) return;

    const id = this.nextId++;
    this.items.update((toasts) => [...toasts, { id, message, type }]);

    if (this.isBrowser) {
      this.timers.set(
        id,
        setTimeout(() => this.dismiss(id), duration),
      );
    }
  }

  dismiss(id: number): void {
    const timer = this.timers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(id);
    }
    this.items.update((toasts) => toasts.filter((toast) => toast.id !== id));
  }

  ngOnDestroy(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }
}

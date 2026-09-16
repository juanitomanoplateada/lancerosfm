import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ToastQueue } from '../../toasts/toast-queue';
import { ShareStation } from './share-station';

describe('ShareStation', () => {
  let toasts: ToastQueue;

  function render(): HTMLElement {
    const fixture = TestBed.createComponent(ShareStation);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  function link(host: HTMLElement, selector: string): URL {
    return new URL(host.querySelector<HTMLAnchorElement>(selector)!.href);
  }

  function stubClipboard(writeText: () => Promise<void>) {
    const clipboard = { writeText: vi.fn(writeText) };
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true });
    return clipboard;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({});
    toasts = TestBed.inject(ToastQueue);
  });

  afterEach(() => {
    // jsdom no trae portapapeles; el falso no debe llegar a la siguiente prueba.
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('comparte por WhatsApp la portada con el mensaje ya escrito', () => {
    const text = link(render(), 'a[href^="https://wa.me/"]').searchParams.get('text');

    expect(text).toContain('Lanceros Stereo 94.1 FM');
    expect(text).toMatch(/https:\/\/lancerosfm\.com\/$/);
  });

  it('comparte en Facebook la dirección de la portada', () => {
    const url = link(render(), 'a[href^="https://www.facebook.com/sharer/"]');

    expect(url.searchParams.get('u')).toBe('https://lancerosfm.com/');
  });

  it('copia el enlace y lo confirma', async () => {
    const clipboard = stubClipboard(() => Promise.resolve());

    render().querySelector('button')!.click();

    await vi.waitFor(() => expect(toasts.toasts()).toHaveLength(1));
    expect(clipboard.writeText).toHaveBeenCalledWith('https://lancerosfm.com/');
    expect(toasts.toasts()[0].type).toBe('success');
  });

  it('muestra el enlace si el navegador niega el portapapeles', async () => {
    stubClipboard(() => Promise.reject(new Error('Sin permiso')));

    render().querySelector('button')!.click();

    await vi.waitFor(() => expect(toasts.toasts()).toHaveLength(1));
    const [toast] = toasts.toasts();
    expect(toast.type).toBe('error');
    expect(toast.message).toContain('https://lancerosfm.com/');
  });

  it('muestra el enlace si el navegador no tiene portapapeles', async () => {
    render().querySelector('button')!.click();

    await vi.waitFor(() => expect(toasts.toasts()).toHaveLength(1));
    expect(toasts.toasts()[0].type).toBe('error');
  });
});

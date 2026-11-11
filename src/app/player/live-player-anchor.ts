import { isPlatformBrowser } from '@angular/common';
import {
  afterNextRender,
  DestroyRef,
  Directive,
  ElementRef,
  inject,
  PLATFORM_ID,
} from '@angular/core';

import { LivePlayerPresence } from './live-player-presence';

/**
 * Parte del elemento que tiene que verse para darlo por «a la vista». Con el
 * celular acostado el botón grande asoma, pero queda cortado y sin su rótulo:
 * ahí la barra sigue siendo la forma clara de darle a reproducir.
 */
const MOSTLY_VISIBLE = 0.75;

/**
 * Marca el elemento que la barra fija mira para saber si sobra: mientras se vea
 * casi entero, `LivePlayerPresence` lo dice. Lo lleva el botón grande de la
 * portada.
 *
 * Se da por visible desde el prerender, porque la portada abre siempre por
 * arriba: así la barra ya sale apartada en el HTML, en vez de esconderse de
 * golpe cuando termina de cargar el JavaScript.
 */
@Directive({ selector: '[appLivePlayerAnchor]' })
export class LivePlayerAnchor {
  constructor() {
    const presence = inject(LivePlayerPresence);
    const destroyRef = inject(DestroyRef);
    const element = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

    presence.set(true);
    destroyRef.onDestroy(() => presence.set(false));

    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;

    afterNextRender(() => {
      // Sin observador no hay forma de saber cuándo el oyente baja por la
      // página: es preferible la barra siempre a la vista.
      if (typeof IntersectionObserver === 'undefined') {
        presence.set(false);
        return;
      }

      const observer = new IntersectionObserver(
        (entries) => {
          // Si llegan varios cambios juntos, manda el último.
          for (const entry of entries) presence.set(entry.intersectionRatio >= MOSTLY_VISIBLE);
        },
        { threshold: MOSTLY_VISIBLE },
      );
      observer.observe(element);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

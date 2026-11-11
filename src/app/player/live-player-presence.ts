import { isPlatformServer } from '@angular/common';
import {
  inject,
  Injectable,
  makeStateKey,
  PLATFORM_ID,
  signal,
  TransferState,
} from '@angular/core';

/** Lo que vio el prerender, anotado en el HTML para que el navegador arranque igual. */
const ON_SCREEN = makeStateKey<boolean>('live-player-on-screen');

/**
 * Dice si el reproductor grande de la portada está a la vista.
 *
 * Mientras lo está, la barra fija repite el mismo botón y, en una pantalla
 * pequeña, se monta justo encima de «Escuchar en vivo». La portada publica aquí
 * lo que ve y la barra decide con eso si se aparta: así ninguna de las dos
 * tiene que conocer a la otra.
 */
@Injectable({ providedIn: 'root' })
export class LivePlayerPresence {
  private readonly transferState = inject(TransferState);
  private readonly isServer = isPlatformServer(inject(PLATFORM_ID));

  /**
   * Arranca con lo que dejó anotado el prerender. En el navegador la barra se
   * dibuja antes de que el router monte la portada: si aquí se empezara siempre
   * en `false`, la barra se asomaría un instante al cargar y volvería a
   * esconderse.
   */
  private readonly present = signal(this.transferState.get(ON_SCREEN, false));

  /** `true` mientras el reproductor grande está en pantalla. */
  readonly onScreen = this.present.asReadonly();

  set(onScreen: boolean): void {
    this.present.set(onScreen);
    if (this.isServer) this.transferState.set(ON_SCREEN, onScreen);
  }
}

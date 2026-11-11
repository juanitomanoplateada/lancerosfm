import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { NAVIGATION } from '../navigation';

/**
 * La navegación del celular: una fila de pestañas fija abajo, donde llega el
 * pulgar, en vez de un menú arriba que obliga a subir toda la página para
 * cambiar de sección. Encima de ella se apoya la barra del reproductor.
 *
 * En pantallas anchas no se dibuja: las mismas secciones están en la cabecera.
 */
@Component({
  selector: 'app-tab-bar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './tab-bar.html',
  styleUrl: './tab-bar.scss',
})
export class TabBar {
  protected readonly items = NAVIGATION;
}

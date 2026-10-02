import { RenderMode } from '@angular/ssr';
import { describe, expect, it } from 'vitest';

import { serverRoutes } from './app.routes.server';

describe('serverRoutes', () => {
  it('prerenderiza el sitio entero: Vercel lo sirve como archivos estáticos', () => {
    expect(serverRoutes).toEqual([{ path: '**', renderMode: RenderMode.Prerender }]);
  });
});

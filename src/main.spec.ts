import { afterEach, describe, expect, it, vi } from 'vitest';

describe('arranque en el navegador', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('deja el error en la consola si la aplicación no encuentra dónde montarse', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    // Sin canal de metadatos: el reproductor se crea al arrancar y no debe salir a la red.
    vi.stubGlobal('EventSource', undefined);
    document.querySelectorAll('app-root').forEach((element) => element.remove());

    await import('./main');

    await vi.waitFor(() =>
      expect(consoleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('app-root') }),
      ),
    );
  });
});

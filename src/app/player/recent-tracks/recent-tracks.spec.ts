import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { RadioPlayer } from '../radio-player';
import { PlayedTrack } from '../track';
import { RecentTracks } from './recent-tracks';

describe('RecentTracks', () => {
  const recentTracks = signal<readonly PlayedTrack[]>([]);
  let fixture: ComponentFixture<RecentTracks>;

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function rows(): HTMLElement[] {
    return [...host().querySelectorAll<HTMLElement>('.recent__item')];
  }

  const started = new Date(2026, 2, 14, 10, 42);

  beforeEach(() => {
    recentTracks.set([]);
    TestBed.configureTestingModule({
      providers: [{ provide: RadioPlayer, useValue: { recentTracks } }],
    });
    fixture = TestBed.createComponent(RecentTracks);
    fixture.autoDetectChanges();
  });

  it('no dibuja nada mientras no haya sonado ninguna canción', () => {
    expect(host().querySelector('section')).toBeNull();
    expect(host().textContent?.trim()).toBe('');
  });

  it('lista las canciones con artista, título y la hora a la que sonaron', async () => {
    recentTracks.set([
      { artist: 'Darío Gómez', title: 'Nadie es eterno', startedAt: started.getTime() + 240_000 },
      { artist: 'Jorge Celedón', title: 'Ay hombe', startedAt: started.getTime() },
    ]);
    await fixture.whenStable();

    expect(host().querySelector('h2')?.textContent).toContain('Sonó hace poco');
    expect(rows().map((row) => row.querySelector('.recent__track')?.textContent?.trim())).toEqual([
      'Darío Gómez · Nadie es eterno',
      'Jorge Celedón · Ay hombe',
    ]);

    const time = rows()[1].querySelector('time')!;
    expect(time.textContent).toMatch(/^10:42/);
    expect(time.getAttribute('datetime')).toBe(started.toISOString());
  });

  it('deja pedir cada canción otra vez, con el mensaje ya escrito', async () => {
    recentTracks.set([
      { artist: 'Jorge Celedón', title: 'Ay hombe', startedAt: started.getTime() },
    ]);
    await fixture.whenStable();

    const request = rows()[0].querySelector<HTMLAnchorElement>('a')!;
    const message = new URL(request.href).searchParams.get('text');

    expect(request.href).toContain('https://wa.me/573102688737');
    expect(message).toBe('Hola, quiero solicitar la canción: Jorge Celedón - Ay hombe.');
    expect(request.getAttribute('aria-label')).toBe('Pedir otra vez Ay hombe, de Jorge Celedón');
    expect(request.target).toBe('_blank');
  });
});

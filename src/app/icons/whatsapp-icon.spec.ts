import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';

import { WhatsappIcon } from './whatsapp-icon';

describe('WhatsappIcon', () => {
  it('es decorativo: el nombre lo pone el control o el texto que lo acompaña', () => {
    const fixture = TestBed.createComponent(WhatsappIcon);
    fixture.detectChanges();

    const svg = (fixture.nativeElement as HTMLElement).querySelector('svg');
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
    expect(svg?.querySelector('path')).not.toBeNull();
  });
});

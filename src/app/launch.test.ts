import { describe, expect, it } from 'vitest';
import { launchRouteFromSearch } from './launch';

describe('launchRouteFromSearch', () => {
  it('?action=start opens classic-90', () => {
    expect(launchRouteFromSearch('?action=start')).toEqual({ view: 'reset', protocolId: 'classic-90' });
    expect(launchRouteFromSearch('?utm_source=x&action=start')).toEqual({ view: 'reset', protocolId: 'classic-90' });
  });

  it('anything else opens normally', () => {
    expect(launchRouteFromSearch('')).toBeNull();
    expect(launchRouteFromSearch('?action=stop')).toBeNull();
    expect(launchRouteFromSearch('?action=START')).toBeNull();
    expect(launchRouteFromSearch('?start')).toBeNull();
  });
});

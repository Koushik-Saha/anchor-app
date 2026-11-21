import { describe, expect, it } from 'vitest';
import { launchRouteFromSearch, routeFromUrl } from './launch';

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

describe('routeFromUrl', () => {
  const start = { view: 'reset', protocolId: 'classic-90' };

  it('anchor://start in every form the OSes deliver it', () => {
    expect(routeFromUrl('anchor://start')).toEqual(start);
    expect(routeFromUrl('anchor://start/')).toEqual(start);
    expect(routeFromUrl('anchor:start')).toEqual(start);
    expect(routeFromUrl('anchor:///start')).toEqual(start);
  });

  it('web launch URLs with ?action=start', () => {
    expect(routeFromUrl('https://anchor.example/?action=start')).toEqual(start);
    expect(routeFromUrl('http://localhost:4173/?action=start')).toEqual(start);
  });

  it('ignores anything else, including junk', () => {
    expect(routeFromUrl('anchor://settings')).toBeNull();
    expect(routeFromUrl('anchor://')).toBeNull();
    expect(routeFromUrl('https://anchor.example/')).toBeNull();
    expect(routeFromUrl('other://start')).toBeNull();
    expect(routeFromUrl('not a url')).toBeNull();
    expect(routeFromUrl(null)).toBeNull();
    expect(routeFromUrl('')).toBeNull();
  });
});

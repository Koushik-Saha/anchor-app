import { DEFAULT_PROTOCOL_ID } from '../content/protocols';
import type { Route } from './navigation';

/**
 * The route a launch URL asks for. `?action=start` (the "Start reset" home-screen
 * shortcut, and later the anchor://start deep link) opens straight into classic-90.
 */
export function launchRouteFromSearch(search: string): Route | null {
  const action = new URLSearchParams(search).get('action');
  return action === 'start' ? { view: 'reset', protocolId: DEFAULT_PROTOCOL_ID } : null;
}

/**
 * Reads the launch URL once at startup and strips `action` from the address bar,
 * so a later reload (or the OS restoring the tab) lands on Home instead of
 * starting another reset. Call exactly once, before the first render.
 */
export function consumeLaunchRoute(): Route {
  if (typeof window === 'undefined') return { view: 'home' };
  const route = launchRouteFromSearch(window.location.search);
  if (route) {
    const url = new URL(window.location.href);
    url.searchParams.delete('action');
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
  return route ?? { view: 'home' };
}

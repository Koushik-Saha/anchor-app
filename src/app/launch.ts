import { DEFAULT_PROTOCOL_ID } from '../content/protocols';
import type { Route } from './navigation';

const START: Route = { view: 'reset', protocolId: DEFAULT_PROTOCOL_ID };

/**
 * The route a launch URL asks for. `?action=start` (the "Start reset" home-screen
 * shortcut, and later the anchor://start deep link) opens straight into classic-90.
 */
export function launchRouteFromSearch(search: string): Route | null {
  const action = new URLSearchParams(search).get('action');
  return action === 'start' ? START : null;
}

/**
 * The route any launch/open URL asks for:
 *   anchor://start, anchor:start, anchor://start/   (native URL scheme + Android shortcut)
 *   https://…/?action=start                        (PWA manifest shortcut)
 */
export function routeFromUrl(url: string | null | undefined): Route | null {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol === 'anchor:') {
    const target = (parsed.hostname || parsed.pathname).replace(/^\/+|\/+$/g, '');
    return target === 'start' ? START : null;
  }
  return launchRouteFromSearch(parsed.search);
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

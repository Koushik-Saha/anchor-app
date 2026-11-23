import { createContext, useContext } from 'react';
import type { CUSTOM_RESET_ID } from '../content/customReset';
import type { ProtocolId } from '../content/protocols';

/** Anything the Reset screen can play: a built-in, or the person's custom reset. */
export type ResetId = ProtocolId | typeof CUSTOM_RESET_ID;

/**
 * No router: a typed view-state switch keeps the bundle small and transitions instant.
 * Views that need data carry it in the route.
 */
export type Route =
  | { view: 'home' }
  | { view: 'library' }
  | { view: 'plan' }
  | { view: 'history' }
  | { view: 'what-helped' }
  | { view: 'builder' }
  | { view: 'settings' }
  /** `runId` changes when a shortcut restarts a reset that is already on screen. */
  | { view: 'reset'; protocolId: ResetId; runId?: number }
  /** Choose a breathing pattern, then start `protocolId` (protocols with `choosePattern`). */
  | { view: 'pattern'; protocolId: ProtocolId }
  /** `completedAt` is the ISO timestamp of the history entry saved for this run. */
  | { view: 'done'; protocolId: ResetId; completedAt: string };

export type View = Route['view'];

/** Views that need no data can be navigated to by name. */
export type SimpleView = 'home' | 'library' | 'plan' | 'history' | 'what-helped' | 'builder' | 'settings';

export interface Navigation {
  route: Route;
  /** `navigate('home')` or `navigate({ view: 'reset', protocolId })`. */
  navigate: (to: SimpleView | Route) => void;
}

export const NavigationContext = createContext<Navigation | null>(null);

export function useNavigation(): Navigation {
  const nav = useContext(NavigationContext);
  if (!nav) throw new Error('useNavigation must be used inside <App>');
  return nav;
}

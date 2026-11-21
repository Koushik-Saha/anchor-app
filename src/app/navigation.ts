import { createContext, useContext } from 'react';

/** No router: a view-state switch keeps the bundle small and transitions instant. */
export type View = 'home' | 'reset' | 'done' | 'library' | 'plan' | 'history' | 'settings';

export interface Navigation {
  view: View;
  navigate: (view: View) => void;
}

export const NavigationContext = createContext<Navigation | null>(null);

export function useNavigation(): Navigation {
  const nav = useContext(NavigationContext);
  if (!nav) throw new Error('useNavigation must be used inside <App>');
  return nav;
}

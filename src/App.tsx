import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { NavigationContext, type View } from './app/navigation';
import { Done } from './screens/Done';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Library } from './screens/Library';
import { Plan } from './screens/Plan';
import { Reset } from './screens/Reset';
import { Settings } from './screens/Settings';

const SCREENS: Record<View, () => ReactElement> = {
  home: Home,
  reset: Reset,
  done: Done,
  library: Library,
  plan: Plan,
  history: History,
  settings: Settings,
};

export function App() {
  const [view, setView] = useState<View>('home');
  const nav = useMemo(() => ({ view, navigate: setView }), [view]);

  // Each view starts at the top, like a fresh screen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const Screen = SCREENS[view];
  return (
    <NavigationContext.Provider value={nav}>
      <Screen />
    </NavigationContext.Provider>
  );
}

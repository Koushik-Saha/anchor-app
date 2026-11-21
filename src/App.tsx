import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { routeFromUrl } from './app/launch';
import { NavigationContext, type Navigation, type Route } from './app/navigation';
import * as deepLinks from './platform/deepLinks';
import { Done } from './screens/Done';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Library } from './screens/Library';
import { Plan } from './screens/Plan';
import { Reset } from './screens/Reset';
import { Settings } from './screens/Settings';

function renderRoute(route: Route): ReactElement {
  switch (route.view) {
    case 'home':
      return <Home />;
    case 'reset':
      return <Reset protocolId={route.protocolId} />;
    case 'done':
      return <Done protocolId={route.protocolId} completedAt={route.completedAt} />;
    case 'library':
      return <Library />;
    case 'plan':
      return <Plan />;
    case 'history':
      return <History />;
    case 'settings':
      return <Settings />;
  }
}

export function App({ initialRoute = { view: 'home' } }: { initialRoute?: Route }) {
  const [route, setRoute] = useState<Route>(initialRoute);

  const navigate = useCallback<Navigation['navigate']>((to) => {
    setRoute(typeof to === 'string' ? { view: to } : to);
  }, []);

  const nav = useMemo(() => ({ route, navigate }), [route, navigate]);

  // anchor://start while the app is already open (Android shortcut, Shortcuts app, link):
  // jump into a reset — unless one is already running, which is never interrupted.
  useEffect(
    () =>
      deepLinks.onOpenUrl((url) => {
        const next = routeFromUrl(url);
        if (next) setRoute((current) => (current.view === 'reset' ? current : next));
      }),
    [],
  );

  // Each view starts at the top, like a fresh screen.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return <NavigationContext.Provider value={nav}>{renderRoute(route)}</NavigationContext.Provider>;
}

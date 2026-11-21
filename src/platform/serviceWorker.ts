/**
 * Registers the offline service worker — web only. Inside the native apps the
 * files already ship in the binary; a service worker there would only risk
 * serving stale files after an app update.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  const base = import.meta.env.BASE_URL;
  const register = () => {
    navigator.serviceWorker.register(`${base}sw.js`, { scope: base }).catch(() => undefined);
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

import { useSyncExternalStore } from 'react';
import { useSettings } from './settings';

const QUERY = '(prefers-reduced-motion: reduce)';

const subscribe = (onChange: () => void): (() => void) => {
  if (typeof window === 'undefined' || !window.matchMedia) return () => undefined;
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
};

const getSnapshot = (): boolean => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;

/** Live OS "reduce motion" preference. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

/** Reduce motion if the OS asks for it OR the in-app setting is on. */
export function useReducedMotion(): boolean {
  const osPrefers = usePrefersReducedMotion();
  const { settings } = useSettings();
  return osPrefers || settings.reducedMotion;
}

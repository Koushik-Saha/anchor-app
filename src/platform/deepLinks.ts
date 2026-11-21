/**
 * Deep-link adapter: how the app learns it was opened via anchor://start
 * (custom URL scheme, Android launcher shortcut, iOS Shortcuts app).
 * Use as a namespace: import * as deepLinks from '../platform/deepLinks';
 *
 * Web: the launch URL is the page URL (?action=start); nothing arrives later.
 * Native: @capacitor/app getLaunchUrl() + appUrlOpen (see nativeAdapters.ts).
 * Never throws.
 */

export interface DeepLinkAdapter {
  /** The URL that cold-started the app, if any. */
  getLaunchUrl(): Promise<string | null>;
  /** URLs opened while the app is already running. Returns an unsubscribe function. */
  onOpenUrl(listener: (url: string) => void): () => void;
}

export const webDeepLinks: DeepLinkAdapter = {
  getLaunchUrl: async () => (typeof window === 'undefined' ? null : window.location.href),
  onOpenUrl: () => () => undefined,
};

let adapter: DeepLinkAdapter = webDeepLinks;

export function setAdapter(next: DeepLinkAdapter): void {
  adapter = next;
}

export async function getLaunchUrl(): Promise<string | null> {
  try {
    return await adapter.getLaunchUrl();
  } catch {
    return null;
  }
}

export function onOpenUrl(listener: (url: string) => void): () => void {
  try {
    return adapter.onOpenUrl((url) => {
      try {
        listener(url);
      } catch {
        /* a bad link must never crash the app */
      }
    });
  } catch {
    return () => undefined;
  }
}

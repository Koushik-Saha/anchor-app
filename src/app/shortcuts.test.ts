import { describe, expect, it } from 'vitest';
import { createStartLinkFilter, DUPLICATE_LINK_MS, freshRunRoute, routeFromUrl } from './launch';
import type { Route } from './navigation';
import { PWA_MANIFEST } from './pwaManifest';

const rawFile = (files: Record<string, unknown>): string => String(Object.values(files)[0] ?? '');
const ANDROID_SHORTCUTS = rawFile(
  import.meta.glob('../../android/app/src/main/res/xml/shortcuts.xml', { query: '?raw', import: 'default', eager: true }),
);
const ANDROID_STRINGS = rawFile(
  import.meta.glob('../../android/app/src/main/res/values/strings.xml', { query: '?raw', import: 'default', eager: true }),
);
const IOS_PLIST = rawFile(import.meta.glob('../../ios/App/App/Info.plist', { query: '?raw', import: 'default', eager: true }));
const IOS_SCENE = rawFile(
  import.meta.glob('../../ios/App/App/SceneDelegate.swift', { query: '?raw', import: 'default', eager: true }),
);
const PUBLIC_FILES = Object.keys(import.meta.glob('../../public/*'));

const classic = { view: 'reset', protocolId: 'classic-90' };

describe('one shared start route', () => {
  it('Android, iOS and the PWA all resolve to the classic reset', () => {
    const androidUrl = /android:data="([^"]+)"/.exec(ANDROID_SHORTCUTS)?.[1];
    const iosUrl = /URL\(string: "([^"]+)"\)/.exec(IOS_SCENE)?.[1];
    const webUrl = new URL(PWA_MANIFEST.shortcuts[0]?.url ?? '', 'https://anchor.example/').href;
    expect(androidUrl).toBe('anchor://start');
    expect(iosUrl).toBe('anchor://start');
    for (const url of [androidUrl, iosUrl, webUrl]) expect(routeFromUrl(url)).toEqual(classic);
  });

  it('every entry point is labeled "Start reset"', () => {
    expect(PWA_MANIFEST.shortcuts[0]?.name).toBe('Start reset');
    expect(ANDROID_STRINGS).toContain('<string name="shortcut_start_short">Start reset</string>');
    expect(ANDROID_STRINGS).toContain('<string name="shortcut_start_long">Start reset</string>');
    expect(IOS_PLIST).toMatch(/UIApplicationShortcutItemTitle<\/key>\s*<string>Start reset<\/string>/);
  });

  it('the iOS quick action type matches its handler', () => {
    const type = /UIApplicationShortcutItemType<\/key>\s*<string>([^<]+)</.exec(IOS_PLIST)?.[1];
    expect(type).toBe('app.anchor.reset.start');
    expect(IOS_SCENE).toContain(`startShortcutType = "${type}"`);
    expect(IOS_SCENE).toContain('connectionOptions.shortcutItem');
    expect(IOS_SCENE).toContain('performActionFor shortcutItem');
  });
});

describe('web app manifest', () => {
  it('has the fields an installable app needs', () => {
    expect(PWA_MANIFEST).toMatchObject({ name: 'Anchor', short_name: 'Anchor', start_url: '/', scope: '/', display: 'standalone' });
    expect(PWA_MANIFEST.theme_color).toMatch(/^#[0-9A-F]{6}$/i);
    const sizes = PWA_MANIFEST.icons.map((i) => i.sizes);
    expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
    expect(PWA_MANIFEST.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  });

  it('every icon it names exists in public/', () => {
    const icons = [...PWA_MANIFEST.icons, ...PWA_MANIFEST.shortcuts.flatMap((s) => s.icons)];
    for (const { src } of icons) expect(PUBLIC_FILES.some((f) => f.endsWith(`/public/${src}`)), src).toBe(true);
  });

  it('the shortcut stays inside the app scope', () => {
    for (const s of PWA_MANIFEST.shortcuts) expect(s.url.startsWith(PWA_MANIFEST.scope)).toBe(true);
  });
});

describe('a shortcut always starts a fresh reset', () => {
  const start = routeFromUrl('anchor://start') as Route;

  it.each<Route>([{ view: 'home' }, { view: 'library' }, { view: 'settings' }, { view: 'done', protocolId: 'box-breathing', completedAt: 'x' }])(
    'from %o',
    (current) => {
      expect(freshRunRoute(current, start)).toEqual({ ...classic, runId: 1 });
    },
  );

  it('over a running reset of any kind, with a new run each time', () => {
    const first = freshRunRoute({ view: 'reset', protocolId: 'night-protocol' }, start);
    expect(first).toEqual({ ...classic, runId: 1 });
    expect(freshRunRoute(first, start)).toEqual({ ...classic, runId: 2 });
  });

  it('ignores a repeat delivery of the launch link, then accepts a later tap', () => {
    let t = 1000;
    const accept = createStartLinkFilter(true, () => t);
    t += 100;
    expect(accept()).toBe(false);
    t += DUPLICATE_LINK_MS;
    expect(accept()).toBe(true);
    t += 100;
    expect(accept()).toBe(false);
  });

  it('accepts the first link when the app was not launched by one', () => {
    expect(createStartLinkFilter(false, () => 5)()).toBe(true);
  });
});

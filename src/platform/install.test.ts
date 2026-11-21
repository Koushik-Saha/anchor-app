import { describe, expect, it } from 'vitest';
import { detectInstallPlatform, shouldShowInstallHint, type InstallState } from './install';

const UA = {
  iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  ipadOS: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  android: 'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  macChrome: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  otherMobile: 'Mozilla/5.0 (Mobile; rv:120.0) Gecko/120.0 Firefox/120.0 KAIOS/3.0',
};

describe('detectInstallPlatform', () => {
  it('recognises iPhone and iPadOS (which pretends to be a Mac)', () => {
    expect(detectInstallPlatform({ userAgent: UA.iphone, maxTouchPoints: 5 })).toBe('ios');
    expect(detectInstallPlatform({ userAgent: UA.ipadOS, maxTouchPoints: 5 })).toBe('ios');
  });

  it('recognises Android and other mobile browsers', () => {
    expect(detectInstallPlatform({ userAgent: UA.android, maxTouchPoints: 5 })).toBe('android');
    expect(detectInstallPlatform({ userAgent: UA.otherMobile, maxTouchPoints: 1 })).toBe('other-mobile');
    expect(detectInstallPlatform({ userAgent: 'SomeBrowser', maxTouchPoints: 0, uaDataMobile: true })).toBe('other-mobile');
  });

  it('treats desktop browsers (incl. a real Mac) as desktop', () => {
    expect(detectInstallPlatform({ userAgent: UA.ipadOS, maxTouchPoints: 0 })).toBe('desktop'); // real Mac Safari
    expect(detectInstallPlatform({ userAgent: UA.macChrome, maxTouchPoints: 0 })).toBe('desktop');
    expect(detectInstallPlatform({ userAgent: UA.windows, maxTouchPoints: 0 })).toBe('desktop');
  });
});

describe('shouldShowInstallHint', () => {
  const mobile: InstallState = { platform: 'android', standalone: false, canPrompt: false, installed: false };

  it('shows on a mobile browser that has not installed or dismissed', () => {
    expect(shouldShowInstallHint(mobile, false)).toBe(true);
    expect(shouldShowInstallHint({ ...mobile, platform: 'ios' }, false)).toBe(true);
  });

  it('never shows on desktop, once installed, when running installed, or after dismissal', () => {
    expect(shouldShowInstallHint({ ...mobile, platform: 'desktop' }, false)).toBe(false);
    expect(shouldShowInstallHint({ ...mobile, standalone: true }, false)).toBe(false);
    expect(shouldShowInstallHint({ ...mobile, installed: true }, false)).toBe(false);
    expect(shouldShowInstallHint(mobile, true)).toBe(false);
  });
});

/**
 * Capacitor implementations of the platform adapters. This module is only ever
 * loaded with a dynamic import() on iOS / Android (see main.tsx), so the web
 * bundle never downloads native plugin code. Call sites don't change: they keep
 * using storage / haptics / wakeLock / deepLinks as before.
 */
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { NativePurchases, PURCHASE_TYPE } from '@capgo/native-purchases';
import * as deepLinks from './deepLinks';
import * as haptics from './haptics';
import * as purchases from './purchases';
import { setStorageBackend, type StorageBackend } from './storage';
import * as wakeLock from './wakeLock';

/** Capacitor Preferences: UserDefaults on iOS, SharedPreferences on Android — not purged like web storage. */
export function createPreferencesBackend(): StorageBackend {
  return {
    getItem: async (key) => (await Preferences.get({ key })).value,
    setItem: (key, value) => Preferences.set({ key, value }),
    removeItem: (key) => Preferences.remove({ key }),
  };
}

/** Real haptic engine (Taptic Engine on iPhone), not just a buzz. */
export function createNativeHaptics(): haptics.HapticsAdapter {
  return {
    supported: true,
    async pulse(pattern) {
      switch (pattern) {
        case 'tap':
          return Haptics.impact({ style: ImpactStyle.Light });
        case 'phase':
          return Haptics.impact({ style: ImpactStyle.Medium });
        case 'done':
          return Haptics.notification({ type: NotificationType.Success });
      }
    },
  };
}

/** Keeps the screen on (iOS idleTimerDisabled / Android FLAG_KEEP_SCREEN_ON). No permission needed. */
export function createNativeKeepAwake(): wakeLock.WakeLockAdapter {
  let held = false;
  return {
    supported: true,
    isHeld: () => held,
    async acquire() {
      await KeepAwake.keepAwake();
      held = true;
    },
    async release() {
      held = false;
      await KeepAwake.allowSleep();
    },
  };
}

export function createNativeDeepLinks(): deepLinks.DeepLinkAdapter {
  return {
    getLaunchUrl: async () => (await App.getLaunchUrl())?.url ?? null,
    onOpenUrl(listener) {
      const handle = App.addListener('appUrlOpen', ({ url }) => listener(url));
      return () => void handle.then((h) => h.remove()).catch(() => undefined);
    },
  };
}

/**
 * One-time unlock through StoreKit 2 / Google Play Billing directly — Apple and
 * Google only, no third-party purchase server, no API keys.
 */
export function createNativePurchases(): purchases.PurchasesAdapter {
  const product = { productIdentifier: purchases.UNLOCK_PRODUCT_ID, productType: PURCHASE_TYPE.INAPP };

  // Silent: Transaction.currentEntitlements (iOS) / queryPurchases (Android) — no sign-in prompt.
  const ownsUnlock = async (): Promise<boolean> => {
    const { purchases: owned } = await NativePurchases.getPurchases({
      productType: PURCHASE_TYPE.INAPP,
      onlyCurrentEntitlements: true, // iOS: only the signed-in Apple ID's active entitlements
    });
    return owned.some(purchases.grantsUnlock);
  };

  return {
    available: true,

    async getUnlockPrice() {
      const { product: info } = await NativePurchases.getProduct(product);
      return info.priceString || null;
    },

    async purchaseUnlock() {
      try {
        const transaction = await NativePurchases.purchaseProduct(product);
        if (purchases.grantsUnlock(transaction)) return 'purchased';
        return transaction.purchaseState === '0' ? 'pending' : 'failed';
      } catch (error) {
        const kind = purchases.classifyPurchaseError(error);
        if (kind === 'already-owned') return (await ownsUnlock()) ? 'purchased' : 'failed';
        return kind;
      }
    },

    async restore() {
      await NativePurchases.restorePurchases(); // iOS: AppStore.sync(), may ask to sign in
      return ownsUnlock();
    },

    ownsUnlock,

    onUnlockGranted(listener) {
      const handle = NativePurchases.addListener('transactionUpdated', (transaction) => {
        if (purchases.grantsUnlock(transaction)) listener();
      });
      return () => void handle.then((h) => h.remove()).catch(() => undefined);
    },
  };
}

export function installNativeAdapters(): void {
  setStorageBackend(createPreferencesBackend());
  haptics.setAdapter(createNativeHaptics());
  wakeLock.setAdapter(createNativeKeepAwake());
  deepLinks.setAdapter(createNativeDeepLinks());
  purchases.setAdapter(createNativePurchases());
}

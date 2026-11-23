/** The device's preferred locales, most preferred first. Read on-device; never throws. */
export function deviceLocales(): readonly string[] {
  try {
    if (typeof navigator === 'undefined') return [];
    if (navigator.languages?.length) return navigator.languages;
    return navigator.language ? [navigator.language] : [];
  } catch {
    return [];
  }
}

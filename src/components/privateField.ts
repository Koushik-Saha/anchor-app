/**
 * "This never leaves your device" also means: no cloud spellcheck and no grammar
 * extensions reading these fields (they can upload what's typed). OS keyboards stay on-device.
 */
export const PRIVATE_FIELD = {
  spellCheck: false,
  autoCorrect: 'off',
  autoCapitalize: 'sentences',
  'data-gramm': 'false',
  'data-gramm_editor': 'false',
  'data-enable-grammarly': 'false',
  'data-lt-active': 'false',
} as const;

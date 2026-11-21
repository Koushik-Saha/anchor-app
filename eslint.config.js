import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

// CLAUDE.md rule 1: no network calls anywhere in app code.
const NETWORK_MSG = 'Anchor makes no network calls (CLAUDE.md rule 1).';
const networkGlobals = ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource'].map((name) => ({
  name,
  message: NETWORK_MSG,
}));
const networkProperties = [{ object: 'navigator', property: 'sendBeacon', message: NETWORK_MSG }];

// CLAUDE.md rules 3 & 4: storage and device APIs only via src/platform.
const PLATFORM_MSG = 'Use the adapter in src/platform instead (CLAUDE.md rules 3–4).';
const deviceGlobals = ['localStorage', 'sessionStorage', 'indexedDB', 'AudioContext'].map((name) => ({
  name,
  message: PLATFORM_MSG,
}));
const deviceProperties = [
  ...['window', 'globalThis', 'self'].flatMap((object) =>
    ['localStorage', 'sessionStorage', 'indexedDB'].map((property) => ({ object, property, message: PLATFORM_MSG })),
  ),
  { object: 'navigator', property: 'vibrate', message: PLATFORM_MSG },
  { object: 'navigator', property: 'wakeLock', message: PLATFORM_MSG },
];
const capacitorImports = { group: ['@capacitor/*'], message: PLATFORM_MSG };

export default defineConfig(
  { ignores: ['dist', 'dev-dist', 'coverage', 'node_modules'] },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strict,
      reactHooks.configs.flat['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-globals': ['error', ...networkGlobals, ...deviceGlobals],
      'no-restricted-properties': ['error', ...networkProperties, ...deviceProperties],
      'no-restricted-imports': ['error', { patterns: [capacitorImports] }],
    },
  },
  {
    // Adapters may touch device APIs and Capacitor — but still never the network.
    files: ['src/platform/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...networkGlobals],
      'no-restricted-properties': ['error', ...networkProperties],
      'no-restricted-imports': 'off',
    },
  },
  {
    // The engine is pure TypeScript: no React, no platform, no Capacitor.
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            capacitorImports,
            { group: ['react', 'react-dom', 'react/*', 'react-dom/*'], message: 'src/engine must stay framework-free.' },
            { group: ['**/platform/**', '**/screens/**', '**/components/**'], message: 'src/engine must stay pure.' },
          ],
        },
      ],
    },
  },
  {
    files: ['vite.config.ts', 'vitest.config.ts'],
    languageOptions: { globals: globals.node },
  },
);

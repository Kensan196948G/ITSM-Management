import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'worker-build/**',
      'web/dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'src/generated/**',
      // レガシー資産（OpenDesign参照・移行対象外）
      'v2/**',
      'frontend/**',
      'scrap/**',
      'index.html',
      'ITSM-Management-WebUI.html',
      'ITSM-WebUI-Evaluation.html',
      'deck-stage.js',
      'backend/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts', 'scripts/**/*.ts', 'tests/**/*.ts', 'web/src/**/*.{ts,tsx}'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        fetch: 'readonly',
      },
    },
  },
);

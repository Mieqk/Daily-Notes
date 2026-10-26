import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// Правила мягкие: цель — ловить настоящие ошибки, а не переписывать код ради стиля.
export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'android', 'ios', 'public', 'screenshots'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
    },
  },
  {
    files: ['api/**/*.js', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node, fetch: 'readonly' } },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-control-regex': 'off', // регулярки чистят управляющие символы намеренно
      '@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true, allowShortCircuit: true }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
);

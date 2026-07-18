module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  env: {
    browser: true,
    es2020: true,
  },
  ignorePatterns: ['dist', 'node_modules', '*.cjs'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    'no-restricted-properties': [
      'error',
      {
        object: 'Math',
        property: 'random',
        message: 'Never use Math.random() — use rngFromSeed() from core/prng.ts instead.',
      },
    ],
  },
};

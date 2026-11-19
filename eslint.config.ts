import config from './packages/eslint-config/eslint.config';

export default [
  ...config,
  {
    files: ['packages/player/chromium/preload.cjs'],
    rules: {
      '@typescript-eslint/no-require-imports': [
        'error',
        { allow: ['^electron$'] },
      ],
    },
  },
];

import { recommended } from '@july_cm/eslint-config';
import { defineConfig } from 'eslint/config';

export default defineConfig(
  {
    ignores: ['libs'],
  },
  ...recommended
);

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['apps/web/**/*.{test,spec}.ts?(x)'],
    environment: 'jsdom',
    reporters: 'default',
    globals: false,
  },
});


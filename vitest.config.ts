import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@plot-fig/figure-schema': fileURLToPath(
        new URL('./packages/figure-schema/src/index.ts', import.meta.url),
      ),
      '@plot-fig/figure-migrations': fileURLToPath(
        new URL('./packages/figure-migrations/src/index.ts', import.meta.url),
      ),
      '@plot-fig/origin-compat': fileURLToPath(
        new URL('./packages/origin-compat/src/index.ts', import.meta.url),
      ),
      '@plot-fig/data-binding': fileURLToPath(
        new URL('./packages/data-binding/src/index.ts', import.meta.url),
      ),
    },
  },
  test: {
    include: ['packages/**/*.test.ts', 'tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['packages/*/src/**/*.ts'],
      exclude: ['packages/*/src/index.ts'],
    },
  },
});

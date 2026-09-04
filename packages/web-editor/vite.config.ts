import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@plot-fig/data-binding': fileURLToPath(
        new URL('../data-binding/src/index.ts', import.meta.url),
      ),
      '@plot-fig/figure-schema': fileURLToPath(
        new URL('../figure-schema/src/index.ts', import.meta.url),
      ),
      '@plot-fig/svg-renderer': fileURLToPath(
        new URL('../svg-renderer/src/index.ts', import.meta.url),
      ),
    },
  },
});

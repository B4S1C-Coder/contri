import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { panel: 'index.html', background: 'src/background.ts' },
      output: { entryFileNames: '[name].js' }
    }
  },
  test: { environment: 'node' }
});

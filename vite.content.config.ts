import { defineConfig } from 'vite';

/** The content script must be a single classic script (no ES module imports). */
/** Preact's React-compatible runtime keeps the script that runs on every GitHub page small. */
export const preactAlias = {
  'react-dom/client': 'preact/compat/client',
  'react-dom': 'preact/compat',
  'react/jsx-runtime': 'preact/jsx-runtime',
  react: 'preact/compat',
};

export default defineConfig({
  resolve: { alias: preactAlias },
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    lib: { entry: 'src/content/index.tsx', name: 'Contri', formats: ['iife'], fileName: () => 'widget.js' },
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

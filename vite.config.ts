import { defineConfig } from 'vitest/config';
export default defineConfig({base:'./',build:{outDir:'dist',emptyOutDir:true,rollupOptions:{input:{preview:'index.html',settings:'settings.html',background:'src/background.ts'},output:{entryFileNames:'[name].js'}}},test:{environment:'node'}});

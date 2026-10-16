import { defineConfig } from 'vite';
export default defineConfig({define:{'process.env.NODE_ENV':'"production"'},build:{outDir:'dist',emptyOutDir:false,lib:{entry:'src/content.tsx',name:'ContributorCompass',formats:['iife'],fileName:()=> 'widget.js'},rollupOptions:{output:{inlineDynamicImports:true}},copyPublicDir:false}});

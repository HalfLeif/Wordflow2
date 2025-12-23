
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Replace 'wordflow' with your actual repository name
export default defineConfig({
  plugins: [react()],
  base: './', // Using relative paths makes it work on any sub-path or domain
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
});

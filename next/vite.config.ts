import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  clearScreen: false,
  server: {
    port: 5196,
    host: '127.0.0.1'
  },
  build: {
    target: 'esnext',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          react: ['react', 'react-dom']
        }
      }
    }
  }
});

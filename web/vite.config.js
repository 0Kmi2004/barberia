import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    // 1. Minificación activa para JS y CSS
    minify: 'esbuild', // O 'terser' si tienes el paquete instalado
    cssMinify: true,

    // 2. Múltiples puntos de entrada y versionado de assets para caché de larga duración
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        adminLogin: resolve(import.meta.dirname, 'admin/index.html'),
        adminDashboard: resolve(import.meta.dirname, 'admin/dashboard.html')
      },
      output: {
        // Los nombres de archivos incluyen [hash] para aprovechar la caché inmutable
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    }
  },

  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

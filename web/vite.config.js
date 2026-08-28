import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        adminLogin: resolve(import.meta.dirname, 'admin/index.html'),
        adminDashboard: resolve(import.meta.dirname, 'admin/dashboard.html')
      }
    }
  },
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  }
});

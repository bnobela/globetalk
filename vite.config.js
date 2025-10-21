// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: '.', // project root
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'pages/login.html'),
        onboarding: resolve(__dirname, 'pages/onboarding.html'),
        penpals: resolve(__dirname, 'pages/penpals.html'),
        profile: resolve(__dirname, 'pages/profile.html'),
        settings: resolve(__dirname, 'pages/settings.html'),
        userdashboard: resolve(__dirname, 'pages/userdashboard.html'),
        admin: resolve(__dirname, 'pages/admin.html'),
        chats: resolve(__dirname, 'pages/chats.html'),
        findPal: resolve(__dirname, 'pages/findPal.html')
      }
    }
  },
  resolve: {
    alias: {
      '@frontend': resolve(__dirname, 'src/frontend'),
      '@services': resolve(__dirname, 'src/services')
    }
  }
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/index.html'),
        'enforcement/checkpoint': resolve(__dirname, 'src/enforcement/checkpoint/index.html'),
        'enforcement/delay': resolve(__dirname, 'src/enforcement/delay/index.html'),
        'enforcement/block': resolve(__dirname, 'src/enforcement/block/index.html'),
        'enforcement/pin': resolve(__dirname, 'src/enforcement/pin/index.html'),
        'enforcement/tabbudget': resolve(__dirname, 'src/enforcement/tabbudget/index.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].[hash].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

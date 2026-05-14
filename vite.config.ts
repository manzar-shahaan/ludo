import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const ghostPath = resolve(__dirname, 'src/styles/global-ghost.scss');

export default defineConfig({
  plugins: [vue()],

  resolve: {
    alias: { '@': resolve(__dirname, 'src') }
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern',
        additionalData: (content: string, filepath: string) => {
          if (filepath.includes('global-ghost') || filepath.includes('settings') || filepath.includes('variables') || filepath.includes('mixins') || filepath.includes('animations') || filepath.endsWith('global.scss')) {
            return content;
          }
          return `@use 'sass:color';\n@use "${ghostPath}" as *;\n${content}`;
        }
      }
    }
  },

  define: {
    'process.env.APP_VERSION': JSON.stringify(pkg.version),
    'process.env.BUILD_DATE': JSON.stringify(Date.now())
  },

  server: {
    host: '0.0.0.0',
    port: 8080,
    proxy: {
      '/ws': {
        target: 'http://localhost:3001',
        ws: true,
      }
    }
  },

  preview: {
    host: '0.0.0.0',
    port: 4173
  }
});

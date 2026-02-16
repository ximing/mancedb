import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron/simple';
import renderer from 'vite-plugin-electron-renderer';

// Vite Dev Server URL for the web app (when running in development)
const WEB_APP_DEV_URL = 'http://localhost:9292';

export default defineConfig({
  define: {
    // Inject the dev server URL at build time so it's available in the main process
    'process.env.VITE_DEV_SERVER_URL': JSON.stringify(WEB_APP_DEV_URL),
  },
  plugins: [
    electron({
      main: {
        entry: 'src/main/index.ts',
        onstart({ startup }) {
          process.env.VITE_DEV_SERVER_URL = WEB_APP_DEV_URL;
          startup();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron', '@lancedb/lancedb', '@mancedb/lancedb-core', '@mancedb/dto', 'typedi', 'reflect-metadata'],
            },
          },
        },
      },
      preload: {
        input: 'src/preload/index.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist/preload',
          },
        },
      },
    }),
    renderer(),
  ],
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
});

import { defineConfig } from 'vite';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';

// Vite Dev Server URL for the web app (when running in development)
const WEB_APP_DEV_URL = 'http://localhost:5173';

export default defineConfig({
  plugins: [
    electron([
      {
        // Main process entry
        entry: 'src/main/index.ts',
        onstart({ startup }) {
          // Pass the web app dev server URL to Electron main process
          process.env.VITE_DEV_SERVER_URL = WEB_APP_DEV_URL;
          startup();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist/main',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
      {
        // Preload script entry
        entry: 'src/preload/index.ts',
        onstart({ reload }) {
          reload();
        },
        vite: {
          build: {
            sourcemap: true,
            minify: false,
            outDir: 'dist/preload',
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
    renderer(),
  ],
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
});

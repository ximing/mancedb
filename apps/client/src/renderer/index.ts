// Renderer process entry point
// The web app is loaded from the built files in dist/web
import type { ElectronAPI } from '../types/electron';

// Extend Window interface for the renderer
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

console.log('Electron renderer process started');
console.log('Platform:', window.electronAPI?.platform);

import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../types/electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Platform info
  platform: process.platform,

  // IPC communication
  send: (channel: string, ...args: unknown[]) => {
    const validChannels = ['app:quit', 'window:minimize', 'window:maximize'];
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  receive: (channel: string, callback: (...args: unknown[]) => void) => {
    const validChannels = ['app:update-available'];
    if (validChannels.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  // File system operations (to be implemented in US-004)
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

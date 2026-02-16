import { contextBridge, ipcRenderer } from 'electron';
import type { ElectronAPI } from '../types/electron';

// Valid channels for send/receive
const VALID_SEND_CHANNELS = ['app:quit', 'window:minimize', 'window:maximize'];
const VALID_RECEIVE_CHANNELS = ['app:update-available'];
const VALID_INVOKE_CHANNELS = ['dialog:openDirectory', 'api:request', 'db:connect', 'db:disconnect', 'db:test', 'db:testS3', 'db:connectS3'];

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
const electronAPI: ElectronAPI = {
  // Platform info
  platform: process.platform,

  // IPC communication
  send: (channel: string, ...args: unknown[]) => {
    if (VALID_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args);
    }
  },

  receive: (channel: string, callback: (...args: unknown[]) => void) => {
    if (VALID_RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.on(channel, (_event, ...args) => callback(...args));
    }
  },

  // Invoke pattern for request-response operations
  invoke: (channel: string, ...args: unknown[]) => {
    if (VALID_INVOKE_CHANNELS.includes(channel)) {
      return ipcRenderer.invoke(channel, ...args);
    }
    return Promise.reject(new Error(`Invalid invoke channel: ${channel}`));
  },

  // File system operations (to be implemented in US-004)
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);

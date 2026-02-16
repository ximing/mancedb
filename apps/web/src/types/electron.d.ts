// Type definitions for Electron API exposed to renderer process
// This is used when the web app runs inside Electron

export interface ElectronAPI {
  platform: string;
  send: (channel: string, ...args: unknown[]) => void;
  receive: (channel: string, callback: (...args: unknown[]) => void) => void;
  openDirectory: () => Promise<string | null>;
  /**
   * Invoke a channel and get a promise result
   * Used for API requests in local mode
   */
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};

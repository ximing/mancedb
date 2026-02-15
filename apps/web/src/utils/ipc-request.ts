/**
 * IPC Request utility for Electron environment
 * Replaces HTTP calls with IPC invocations when running in Electron local mode
 */

import { isElectron } from './environment';

// IPC channel prefix for API calls
const IPC_CHANNEL = 'api:request';

/**
 * IPC request options
 */
export interface IPCRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: unknown;
  params?: Record<string, unknown> | object;
}

/**
 * Check if IPC API is available (Electron with local mode)
 */
export function isIPCAvailable(): boolean {
  return isElectron() && typeof window !== 'undefined' && !!window.electronAPI?.invoke;
}

/**
 * IPC response format
 */
export interface IPCResponse<T> {
  code: number;
  data: T;
  message?: string;
}

/**
 * Make an IPC request to the Electron main process
 * This replaces HTTP requests when running in Electron local mode
 */
export async function ipcRequest<T>(options: IPCRequestOptions): Promise<IPCResponse<T>> {
  if (!isIPCAvailable()) {
    throw new Error('IPC not available - not running in Electron or electronAPI not exposed');
  }

  try {
    const response = await window.electronAPI!.invoke!(IPC_CHANNEL, options);
    return response as IPCResponse<T>;
  } catch (error) {
    console.error('IPC request failed:', error);
    throw error;
  }
}

/**
 * Type definition for the extended ElectronAPI with invoke method
 * This will be added to the global Window interface
 */
export interface ExtendedElectronAPI {
  platform: string;
  send: (channel: string, ...args: unknown[]) => void;
  receive: (channel: string, callback: (...args: unknown[]) => void) => void;
  openDirectory: () => Promise<string | null>;
  invoke?: (channel: string, ...args: unknown[]) => Promise<unknown>;
}

// Extend the Window interface to include the invoke method
declare global {
  interface Window {
    electronAPI?: ExtendedElectronAPI;
  }
}

export default ipcRequest;

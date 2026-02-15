/**
 * Environment detection utilities
 * Helps determine if the app is running in Electron or browser
 */

// Type declarations for Electron's process object
declare global {
  interface Process {
    versions?: {
      electron?: string;
    };
    type?: 'browser' | 'renderer';
    platform: string;
  }
}

declare const process: Process | undefined;

/**
 * Check if running in Electron environment
 * Detects both main and renderer processes
 */
export function isElectron(): boolean {
  // Check for Electron's process.versions.electron
  if (typeof process !== 'undefined' && process?.versions?.electron) {
    return true;
  }

  // Check for electronAPI exposed by preload script
  if (typeof window !== 'undefined' && window.electronAPI) {
    return true;
  }

  // Check user agent for Electron
  if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron')) {
    return true;
  }

  return false;
}

/**
 * Check if running in Electron main process (Node.js environment)
 */
export function isElectronMain(): boolean {
  return typeof process !== 'undefined' &&
    process?.versions?.electron != null &&
    process?.type === 'browser';
}

/**
 * Check if running in Electron renderer process
 */
export function isElectronRenderer(): boolean {
  return typeof process !== 'undefined' &&
    process?.versions?.electron != null &&
    process?.type === 'renderer';
}

/**
 * Check if running in browser environment (not Electron)
 */
export function isBrowser(): boolean {
  return !isElectron();
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Get the current platform
 * Returns 'win32', 'darwin', 'linux', or 'browser'
 */
export function getPlatform(): string {
  if (isElectron() && typeof process !== 'undefined' && process?.platform) {
    return process.platform;
  }

  // Browser platform detection
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'win32';
  if (userAgent.includes('mac')) return 'darwin';
  if (userAgent.includes('linux')) return 'linux';

  return 'browser';
}

/**
 * Check if running on macOS
 */
export function isMacOS(): boolean {
  return getPlatform() === 'darwin';
}

/**
 * Check if running on Windows
 */
export function isWindows(): boolean {
  return getPlatform() === 'win32';
}

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return getPlatform() === 'linux';
}

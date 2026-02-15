/**
 * Unified API Client
 * Supports both HTTP (remote server) and IPC (local Electron) modes
 */

import { isElectron } from './environment';
import { ipcRequest, isIPCAvailable } from './ipc-request';
import type { AxiosRequestConfig } from 'axios';

// API mode types
export type APIMode = 'http' | 'ipc';

// Current API mode - defaults to IPC in Electron, HTTP in browser
let currentMode: APIMode = isElectron() ? 'ipc' : 'http';

// API base URL for HTTP mode
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/';

/**
 * Get current API mode
 */
export function getAPIMode(): APIMode {
  return currentMode;
}

/**
 * Set API mode (for testing or manual override)
 */
export function setAPIMode(mode: APIMode): void {
  currentMode = mode;
}

/**
 * Check if running in local mode (IPC/Electron)
 */
export function isLocalMode(): boolean {
  return currentMode === 'ipc' && isIPCAvailable();
}

/**
 * Check if running in remote mode (HTTP)
 */
export function isRemoteMode(): boolean {
  return currentMode === 'http' || !isIPCAvailable();
}

/**
 * Request options for unified API client
 */
export interface APIRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: unknown;
  params?: Record<string, unknown> | object;
  headers?: Record<string, string>;
}

/**
 * API response wrapper
 */
export interface APIResponse<T> {
  code: number;
  data: T;
  message?: string;
}

/**
 * Build full URL for HTTP requests
 */
function buildURL(endpoint: string, params?: Record<string, unknown> | object): string {
  let url = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  // Add query parameters
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'object') {
          searchParams.set(key, encodeURIComponent(JSON.stringify(value)));
        } else {
          searchParams.set(key, String(value));
        }
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  return url;
}

/**
 * Make HTTP request using fetch
 * Mirrors the behavior of the axios-based request.ts
 */
async function httpRequest<T>(options: APIRequestOptions): Promise<APIResponse<T>> {
  const url = buildURL(options.endpoint, options.params);
  const config: AxiosRequestConfig = {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  // Add authorization token if available
  const token = localStorage.getItem('mancedb_token');
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  // Add request body for non-GET requests
  if (options.data && options.method !== 'GET') {
    config.data = JSON.stringify(options.data);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      method: config.method,
      headers: config.headers as Record<string, string>,
      body: config.data as string | undefined,
      credentials: 'include',
    });

    // Handle HTTP errors
    if (!response.ok) {
      if (response.status === 401) {
        // Unauthorized - clear auth data and redirect
        localStorage.removeItem('mancedb_token');
        localStorage.removeItem('mancedb_user');
        if (!window.location.pathname.includes('/auth')) {
          window.location.href = '/auth';
        }
      }

      const errorData = await response.json().catch(() => ({
        code: response.status,
        message: response.statusText,
      }));
      throw errorData;
    }

    const result = await response.json();
    return result as APIResponse<T>;
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Network error
      throw {
        code: -1,
        message: 'Network error: Unable to connect to server',
      };
    }
    throw error;
  }
}

/**
 * Unified API request function
 * Automatically selects HTTP or IPC based on current mode and availability
 */
export async function apiRequest<T>(options: APIRequestOptions): Promise<APIResponse<T>> {
  // Use IPC if in local mode and available
  if (currentMode === 'ipc' && isIPCAvailable()) {
    try {
      return await ipcRequest<T>(options);
    } catch (error) {
      console.warn('IPC request failed, falling back to HTTP:', error);
      // Fall back to HTTP if IPC fails
      return httpRequest<T>(options);
    }
  }

  // Use HTTP for remote mode or when IPC is not available
  return httpRequest<T>(options);
}

/**
 * Convenience methods for common HTTP verbs
 */
export const apiClient = {
  get: <T>(endpoint: string, params?: Record<string, unknown> | object) =>
    apiRequest<T>({ method: 'GET', endpoint, params }),

  post: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>({ method: 'POST', endpoint, data }),

  put: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>({ method: 'PUT', endpoint, data }),

  delete: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>({ method: 'DELETE', endpoint, data }),

  patch: <T>(endpoint: string, data?: unknown) =>
    apiRequest<T>({ method: 'PATCH', endpoint, data }),
};

export default apiClient;

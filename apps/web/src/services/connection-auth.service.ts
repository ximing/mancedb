import { Service } from '@rabjs/react';
import { loginToConnection, refreshConnectionToken } from '../api/connection-auth';

interface ConnectionAuth {
  connectionId: string;
  token: string;
  expiresAt: number;
}

const STORAGE_KEY = 'mancedb_connection_auth';

export class ConnectionAuthService extends Service {
  currentAuth: ConnectionAuth | null = null;
  isAuthenticated = false;

  constructor() {
    super();
    // Try to restore auth from localStorage on initialization
    this.restoreAuth();
  }

  /**
   * Restore authentication from localStorage
   */
  private restoreAuth(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const auth: ConnectionAuth = JSON.parse(stored);
        // Check if token is not expired
        if (auth.expiresAt > Date.now()) {
          this.currentAuth = auth;
          this.isAuthenticated = true;
        } else {
          // Token expired, clear it
          localStorage.removeItem(STORAGE_KEY);
        }
      }
    } catch {
      // Ignore parse errors
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  /**
   * Save authentication to localStorage
   */
  private saveAuth(auth: ConnectionAuth): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
  }

  /**
   * Login to a specific connection
   */
  async login(connectionId: string, username: string, password: string): Promise<boolean> {
    const response = await loginToConnection({
      connectionId,
      username,
      password,
    });

    if (response.code === 0 && response.data) {
      const auth: ConnectionAuth = {
        connectionId,
        token: response.data.token,
        expiresAt: response.data.expiresAt,
      };

      this.currentAuth = auth;
      this.isAuthenticated = true;
      this.saveAuth(auth);

      return true;
    }

    return false;
  }

  /**
   * Refresh the current connection token
   */
  async refreshToken(): Promise<boolean> {
    if (!this.currentAuth) {
      return false;
    }

    const response = await refreshConnectionToken({
      token: this.currentAuth.token,
    });

    if (response.code === 0 && response.data) {
      this.currentAuth = {
        ...this.currentAuth,
        token: response.data.token,
        expiresAt: response.data.expiresAt,
      };
      this.saveAuth(this.currentAuth);
      return true;
    }

    return false;
  }

  /**
   * Logout from the current connection
   */
  logout(): void {
    this.currentAuth = null;
    this.isAuthenticated = false;
    localStorage.removeItem(STORAGE_KEY);
  }

  /**
   * Get the current connection ID
   */
  getCurrentConnectionId(): string | null {
    return this.currentAuth?.connectionId ?? null;
  }

  /**
   * Get the current auth token
   */
  getToken(): string | null {
    return this.currentAuth?.token ?? null;
  }

  /**
   * Check if the current token is expired
   */
  isTokenExpired(): boolean {
    if (!this.currentAuth) {
      return true;
    }
    return this.currentAuth.expiresAt <= Date.now();
  }
}

// Export singleton instance
export const connectionAuthService = new ConnectionAuthService();

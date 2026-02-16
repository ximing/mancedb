import { Service } from '@rabjs/react';

/**
 * AuthService - DEPRECATED
 * Authentication has been removed from the application.
 * This service is kept for backward compatibility but always returns authenticated state.
 */
export class AuthService extends Service {
  /** Always true - authentication removed */
  isAuthenticated = true;
  user = null;
  token = null;

  constructor() {
    super();
    // Clean up any leftover token from localStorage
    localStorage.removeItem('token');
  }

  /**
   * @deprecated Authentication removed, always returns true
   */
  async login(): Promise<boolean> {
    return true;
  }

  /**
   * @deprecated Authentication removed, always returns true
   */
  async register(): Promise<boolean> {
    return true;
  }

  /**
   * @deprecated Authentication removed, no-op
   */
  logout(): void {
    // No-op
  }
}

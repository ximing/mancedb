import { Service } from 'typedi';

export interface ConnectionAuthPayload {
  connectionId: string;
  username: string;
  type: 'local' | 's3';
}

export interface ConnectionAuthResult {
  success: boolean;
  token?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * @deprecated Authentication has been removed. This service returns error responses for compatibility.
 */
@Service()
export class ConnectionAuthService {
  /**
   * @deprecated Authentication has been removed
   */
  async authenticate(): Promise<ConnectionAuthResult> {
    return {
      success: false,
      error: 'Authentication is disabled',
    };
  }

  /**
   * @deprecated Authentication has been removed
   */
  async refreshToken(): Promise<ConnectionAuthResult> {
    return {
      success: false,
      error: 'Token refresh is disabled',
    };
  }

  /**
   * @deprecated Authentication has been removed
   */
  verifyToken(): ConnectionAuthPayload | null {
    return null;
  }
}

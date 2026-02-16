import { Service } from 'typedi';
import jwt from 'jsonwebtoken';
import { ConnectionService } from './connection.service.js';
import { config } from '../config/config.js';

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

/** @deprecated Authentication is being removed - fallback secret for type compatibility */
const JWT_SECRET = config.jwt.secret || 'deprecated-fallback-secret';

@Service()
export class ConnectionAuthService {
  constructor(private connectionService: ConnectionService) {}

  /**
   * Authenticate a user against a connection's credentials
   * @deprecated Authentication is being removed
   */
  async authenticate(connectionId: string, username: string, password: string): Promise<ConnectionAuthResult> {
    try {
      // Get connection with secrets (including password hash)
      const connection = await this.connectionService.getConnectionWithSecrets(connectionId);

      if (!connection) {
        return { success: false, error: 'Connection not found' };
      }

      // Check if the connection has authentication configured
      if (!connection.dbUsername || !connection.dbPasswordHash) {
        return { success: false, error: 'This connection does not require authentication' };
      }

      // Verify username
      if (connection.dbUsername !== username) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Verify password
      const isPasswordValid = await this.connectionService.verifyPassword(password, connection.dbPasswordHash);
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid username or password' };
      }

      // Update last connected timestamp
      await this.connectionService.updateLastConnectedAt(connectionId);

      // Generate JWT token with 24 hour expiration
      const expiresIn = 24 * 60 * 60; // 24 hours in seconds
      const expiresAt = Date.now() + expiresIn * 1000;

      const payload: ConnectionAuthPayload = {
        connectionId: connection.id,
        username: connection.dbUsername,
        type: connection.type,
      };

      const token = jwt.sign(payload, JWT_SECRET, { expiresIn: `${expiresIn}s` });

      return {
        success: true,
        token,
        expiresAt,
      };
    } catch (error) {
      console.error('Connection authentication error:', error);
      return {
        success: false,
        error: 'Authentication failed due to server error',
      };
    }
  }

  /**
   * Refresh an existing JWT token
   * @deprecated Authentication is being removed
   */
  async refreshToken(token: string): Promise<ConnectionAuthResult> {
    try {
      // Verify the existing token
      const decoded = jwt.verify(token, JWT_SECRET) as ConnectionAuthPayload;

      // Check if connection still exists
      const connection = await this.connectionService.getConnectionWithSecrets(decoded.connectionId);
      if (!connection) {
        return { success: false, error: 'Connection no longer exists' };
      }

      // Generate new token with fresh expiration
      const expiresIn = 24 * 60 * 60; // 24 hours in seconds
      const expiresAt = Date.now() + expiresIn * 1000;

      const payload: ConnectionAuthPayload = {
        connectionId: connection.id,
        username: decoded.username,
        type: connection.type,
      };

      const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: `${expiresIn}s` });

      return {
        success: true,
        token: newToken,
        expiresAt,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return { success: false, error: 'Token has expired' };
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return { success: false, error: 'Invalid token' };
      }
      console.error('Token refresh error:', error);
      return { success: false, error: 'Failed to refresh token' };
    }
  }

  /**
   * Verify a JWT token and return the payload
   * @deprecated Authentication is being removed
   */
  verifyToken(token: string): ConnectionAuthPayload | null {
    try {
      return jwt.verify(token, JWT_SECRET) as ConnectionAuthPayload;
    } catch {
      return null;
    }
  }
}

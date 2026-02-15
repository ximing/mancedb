import type {
  ConnectionLoginDto,
  ConnectionLoginResponseDto,
  RefreshTokenDto,
} from '@mancedb/dto';
import request from '../utils/request';

/**
 * Login to a specific connection with username and password
 */
export const loginToConnection = (data: ConnectionLoginDto) => {
  return request.post<
    ConnectionLoginDto,
    { code: number; data: ConnectionLoginResponseDto }
  >('/api/v1/auth/connections/login', data);
};

/**
 * Refresh connection JWT token
 */
export const refreshConnectionToken = (data: RefreshTokenDto) => {
  return request.post<
    RefreshTokenDto,
    { code: number; data: { token: string; expiresAt: number } }
  >('/api/v1/auth/connections/refresh', data);
};

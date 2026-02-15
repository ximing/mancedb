import type {
  ConnectionLoginDto,
  ConnectionLoginResponseDto,
  RefreshTokenDto,
} from '@mancedb/dto';
import { apiClient } from '../utils/api-client';

/**
 * Login to a specific connection with username and password
 */
export const loginToConnection = (data: ConnectionLoginDto) => {
  return apiClient.post<ConnectionLoginResponseDto>('/api/v1/auth/connections/login', data);
};

/**
 * Refresh connection JWT token
 */
export const refreshConnectionToken = (data: RefreshTokenDto) => {
  return apiClient.post<{ token: string; expiresAt: number }>('/api/v1/auth/connections/refresh', data);
};

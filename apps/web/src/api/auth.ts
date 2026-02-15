import type { RegisterDto, LoginDto, LoginResponseDto, UserInfoDto } from '@mancedb/dto';
import { apiClient } from '../utils/api-client';

/**
 * Register a new user
 */
export const register = (data: RegisterDto) => {
  return apiClient.post<{ user: UserInfoDto }>('/api/v1/auth/register', data);
};

/**
 * Login with email and password
 */
export const login = (data: LoginDto) => {
  return apiClient.post<LoginResponseDto>('/api/v1/auth/login', data);
};

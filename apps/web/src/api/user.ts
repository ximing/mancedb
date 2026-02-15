import type { UserInfoDto, UpdateUserDto } from '@mancedb/dto';
import { apiClient } from '../utils/api-client';

/**
 * Get current user info
 */
export const getUserInfo = () => {
  return apiClient.get<UserInfoDto>('/api/v1/user/info');
};

/**
 * Update user info
 */
export const updateUserInfo = (data: UpdateUserDto) => {
  return apiClient.put<{ message: string; user: UserInfoDto }>('/api/v1/user/info', data);
};

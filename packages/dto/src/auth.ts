/**
 * Authentication DTOs
 */

import type { UserInfoDto } from './user.js';

export interface RegisterDto {
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface LoginResponseDto {
  token: string;
  user: UserInfoDto;
}

// Connection-based authentication DTOs
export interface ConnectionLoginDto {
  connectionId: string;
  username: string;
  password: string;
}

export interface ConnectionLoginResponseDto {
  token: string;
  connection: {
    id: string;
    name: string;
    type: 'local' | 's3';
  };
  expiresAt: number;
}

export interface RefreshTokenDto {
  token: string;
}

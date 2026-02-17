/**
 * Connection DTOs
 */

import { IsOptional, IsString } from 'class-validator';

export interface ConnectionDto {
  id: string;
  name: string;
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3Prefix?: string;
  dbUsername?: string;
  hasCredentials?: boolean;
  createdAt: number;
  updatedAt: number;
  lastConnectedAt?: number;
}

export class CreateConnectionDto {
  @IsString()
  name!: string;

  @IsString()
  type!: 'local' | 's3';

  @IsOptional()
  @IsString()
  localPath?: string;

  @IsOptional()
  @IsString()
  s3Bucket?: string;

  @IsOptional()
  @IsString()
  s3Region?: string;

  @IsOptional()
  @IsString()
  s3AccessKey?: string;

  @IsOptional()
  @IsString()
  s3SecretKey?: string;

  @IsOptional()
  @IsString()
  s3Endpoint?: string;

  @IsOptional()
  @IsString()
  s3Prefix?: string;

  @IsOptional()
  @IsString()
  dbUsername?: string;

  @IsOptional()
  @IsString()
  dbPassword?: string;
}

export class UpdateConnectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: 'local' | 's3';

  @IsOptional()
  @IsString()
  localPath?: string;

  @IsOptional()
  @IsString()
  s3Bucket?: string;

  @IsOptional()
  @IsString()
  s3Region?: string;

  @IsOptional()
  @IsString()
  s3AccessKey?: string;

  @IsOptional()
  @IsString()
  s3SecretKey?: string;

  @IsOptional()
  @IsString()
  s3Endpoint?: string;

  @IsOptional()
  @IsString()
  s3Prefix?: string;

  @IsOptional()
  @IsString()
  dbUsername?: string;

  @IsOptional()
  @IsString()
  dbPassword?: string;
}

export interface TestConnectionResponseDto {
  success: boolean;
  message: string;
}

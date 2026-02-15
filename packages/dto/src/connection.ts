/**
 * Connection DTOs
 */

export interface ConnectionDto {
  id: string;
  name: string;
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  dbUsername?: string;
  createdAt: number;
  updatedAt: number;
  lastConnectedAt?: number;
}

export interface CreateConnectionDto {
  name: string;
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  dbUsername?: string;
  dbPassword?: string;
}

export interface UpdateConnectionDto {
  name?: string;
  type?: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  dbUsername?: string;
  dbPassword?: string;
}

export interface TestConnectionResponseDto {
  success: boolean;
  message: string;
}

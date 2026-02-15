import { loadEnv } from './env.js';

// 先加载环境变量
loadEnv();

// 添加配置调试日志
console.log('Current Environment:', process.env.NODE_ENV);

export type StorageType = 'local' | 's3';

// 通用 S3 存储配置（支持 AWS S3、MinIO、Aliyun OSS 作为 S3-compatible 等）
export interface S3StorageConfig {
  bucket: string;
  prefix: string;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  region?: string;
  endpoint?: string; // 可选：自定义端点（如 MinIO、Aliyun OSS 等）
}

// 本地存储配置
export interface LocalStorageConfig {
  path: string;
}

export interface Config {
  port: number;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  jwt: {
    secret: string;
  };
  lancedb: {
    storageType: StorageType;
    path: string; // local: "./lancedb_data" or s3: "s3://bucket/path/to/database"
    versionRetentionDays: number; // 版本保留天数，默认 7 天
    s3?: {
      bucket: string;
      prefix: string; // path inside bucket
      awsAccessKeyId?: string;
      awsSecretAccessKey?: string;
      region?: string;
      endpoint?: string; // S3 endpoint URL (e.g., http://minio:9000)
    };
  };
  locale: {
    language: string; // e.g., 'zh-cn', 'en-us'
    timezone: string; // e.g., 'Asia/Shanghai', 'UTC'
  };
  env: string;
}

export const config: Config = {
  port: Number(process.env.PORT) || 3000,
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:3000').split(','),
    credentials: process.env.CORS_CREDENTIALS === 'true',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  },
  lancedb: {
    storageType: (process.env.LANCEDB_STORAGE_TYPE || 'local') as StorageType,
    path:
      process.env.LANCEDB_STORAGE_TYPE === 's3'
        ? `s3://${process.env.LANCEDB_S3_BUCKET}/${process.env.LANCEDB_S3_PREFIX || 'lancedb'}`
        : process.env.LANCEDB_PATH || './lancedb_data',
    versionRetentionDays: Number(process.env.LANCEDB_VERSION_RETENTION_DAYS) || 7, // 默认保留 7 天
    s3:
      process.env.LANCEDB_STORAGE_TYPE === 's3'
        ? {
            bucket: process.env.LANCEDB_S3_BUCKET || '',
            prefix: process.env.LANCEDB_S3_PREFIX || 'lancedb',
            awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
            awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            region: process.env.AWS_REGION || 'us-east-1',
            endpoint: process.env.LANCEDB_S3_ENDPOINT,
          }
        : undefined,
  },
  locale: {
    language: process.env.LOCALE_LANGUAGE || 'zh-cn',
    timezone: process.env.LOCALE_TIMEZONE || 'Asia/Shanghai',
  },
  env: process.env.NODE_ENV || 'development',
};

import type { UserInfoDto } from '@mancedb/dto';

// Connection auth payload type
export interface ConnectionAuthInfo {
  connectionId: string;
  username: string;
  type: 'local' | 's3';
}

// Extend Express Request type to include user information
declare global {
  namespace Express {
    interface Request {
      user?: UserInfoDto | ConnectionAuthInfo;
    }
  }
}

import { Request, Response, NextFunction } from 'express';

/**
 * @deprecated Authentication has been removed - this middleware now allows all requests
 * Authentication middleware that previously validated the mancedb_token from cookies or headers
 * Now simply passes through all requests without authentication
 */
export const authHandler = async (_req: Request, _res: Response, next: NextFunction) => {
  // Authentication removed - allow all requests
  next();
};

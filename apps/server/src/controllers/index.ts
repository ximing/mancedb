import { AuthV1Controller } from './v1/auth.controller.js';
import { UserV1Controller } from './v1/user.controller.js';
import { StaticController } from './static.controller.js';

// Note: StaticController should be last to handle all non-API routes
export const controllers = [
  AuthV1Controller,
  UserV1Controller,
  StaticController,
];

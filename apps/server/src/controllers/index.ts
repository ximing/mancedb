import { AuthV1Controller } from './v1/auth.controller.js';
import { UserV1Controller } from './v1/user.controller.js';
import { ConnectionV1Controller } from './v1/connection.controller.js';
import { DatabaseV1Controller } from './v1/database.controller.js';
import { TableV1Controller } from './v1/table.controller.js';
import { StaticController } from './static.controller.js';

// Note: StaticController should be last to handle all non-API routes
export const controllers = [
  AuthV1Controller,
  UserV1Controller,
  ConnectionV1Controller,
  DatabaseV1Controller,
  TableV1Controller,
  StaticController,
];

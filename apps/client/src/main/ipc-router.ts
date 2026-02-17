/**
 * IPC Router for handling API requests from the renderer process
 * Maps HTTP-like API calls to native LanceDB operations
 *
 * Response format matches the server API:
 * - code: number (0 for success, see ErrorCode for error codes)
 * - data: T (response payload)
 * - msg: string (message, always present)
 */

import { ipcMain } from 'electron';
import { Container } from 'typedi';
import { LanceDBService } from './services/lancedb.service';
import { CredentialService } from './services/credential.service';
import { ConnectionService } from './services/connection.service';
import type { FilterCondition } from '@mancedb/dto';
import type { S3Config } from './services/credential.service';

// IPC request options type (mirrors the one in web app)
interface IPCRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: unknown;
  params?: Record<string, unknown> | object;
}

// API response format - matches server response structure
interface APIResponse<T> {
  code: number;
  data: T;
  msg: string;
}

// Error codes - matching server error codes
const ErrorCode = {
  // System level errors: 0-99
  SUCCESS: 0,
  SYSTEM_ERROR: 1,
  PARAMS_ERROR: 2,
  NOT_FOUND: 3,
  UNAUTHORIZED: 4,
  FORBIDDEN: 5,

  // Database related errors: 2000-2999
  DB_ERROR: 2000,
  DB_CONNECT_ERROR: 2001,
} as const;

// Error messages
const ErrorMessage: Record<number, string> = {
  [ErrorCode.SUCCESS]: '操作成功',
  [ErrorCode.SYSTEM_ERROR]: '系统错误',
  [ErrorCode.PARAMS_ERROR]: '参数错误',
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.UNAUTHORIZED]: '未授权',
  [ErrorCode.FORBIDDEN]: '禁止访问',
  [ErrorCode.DB_ERROR]: '数据库错误',
  [ErrorCode.DB_CONNECT_ERROR]: '数据库连接错误',
};

/**
 * Log error with structured format for debugging
 */
function logError(context: string, error: unknown, additionalInfo?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[IPC Router Error] ${timestamp} - ${context}`, {
    message: errorMessage,
    stack: errorStack,
    ...additionalInfo,
  });
}

/**
 * Create a success response
 * Matches server ResponseUtil.success format
 */
function successResponse<T>(data: T, msg = ErrorMessage[ErrorCode.SUCCESS]): APIResponse<T> {
  return {
    code: ErrorCode.SUCCESS,
    data,
    msg,
  };
}

/**
 * Create an error response
 * Matches server ResponseUtil.error format
 */
function errorResponse(code: number, msg?: string): APIResponse<null> {
  return {
    code,
    data: null,
    msg: msg || ErrorMessage[code] || ErrorMessage[ErrorCode.SYSTEM_ERROR],
  };
}

/**
 * Get the LanceDBService instance from the DI container
 */
function getLanceDBService(): LanceDBService {
  return Container.get(LanceDBService);
}

/**
 * Get the CredentialService instance from the DI container
 */
function getCredentialService(): CredentialService {
  return Container.get(CredentialService);
}

/**
 * Get the ConnectionService instance from the DI container
 */
function getConnectionService(): ConnectionService {
  return Container.get(ConnectionService);
}

/**
 * Route API request to the appropriate handler
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function routeRequest(options: IPCRequestOptions): Promise<APIResponse<any>> {
  const { method, endpoint, data, params } = options;
  const lancedbService = getLanceDBService();

  console.log(`[IPC Router] ${method} ${endpoint}`, { data, params });

  try {
    // Database info endpoints
    if (endpoint === '/api/v1/database/info' && method === 'GET') {
      const result = await lancedbService.getDatabaseInfo();
      return successResponse(result);
    }

    if (endpoint === '/api/v1/database/tables' && method === 'GET') {
      const result = await lancedbService.getTables();
      return successResponse(result);
    }

    // Create table endpoint - POST /api/v1/tables
    if (endpoint === '/api/v1/tables' && method === 'POST') {
      try {
        const { name, columns } = data as {
          name: string;
          columns: Array<{ name: string; type: string; nullable?: boolean }>;
        };

        // Validate required fields
        if (!name || !name.trim()) {
          return errorResponse(ErrorCode.PARAMS_ERROR, 'Table name is required');
        }

        if (!columns || !Array.isArray(columns) || columns.length === 0) {
          return errorResponse(ErrorCode.PARAMS_ERROR, 'At least one column is required');
        }

        // Validate column definitions
        for (const col of columns) {
          if (!col.name || !col.name.trim()) {
            return errorResponse(ErrorCode.PARAMS_ERROR, 'Column name is required for all columns');
          }
          if (!col.type) {
            return errorResponse(ErrorCode.PARAMS_ERROR, `Column type is required for column '${col.name}'`);
          }
          // Validate column name format
          if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(col.name)) {
            return errorResponse(
              ErrorCode.PARAMS_ERROR,
              `Column name '${col.name}' must start with letter or underscore and contain only letters, numbers, and underscores`
            );
          }
        }

        const result = await lancedbService.createTable(name.trim(), columns);
        return successResponse(result, 'Table created successfully');
      } catch (error) {
        logError('Create table error', error);
        if (error instanceof Error) {
          if (error.message.includes('already exists')) {
            return errorResponse(ErrorCode.PARAMS_ERROR, error.message);
          }
          if (error.message.includes('Table name must start with')) {
            return errorResponse(ErrorCode.PARAMS_ERROR, error.message);
          }
        }
        return errorResponse(ErrorCode.DB_ERROR, error instanceof Error ? error.message : 'Failed to create table');
      }
    }

    // Get table count endpoint - GET /api/v1/tables/:name/count
    const tableCountMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)\/count$/);
    if (tableCountMatch && method === 'GET') {
      try {
        const tableName = decodeURIComponent(tableCountMatch[1]);
        const result = await lancedbService.getTableCount(tableName);
        return successResponse(result);
      } catch (error) {
        logError('Get table count error', error, { tableName: tableCountMatch?.[1] });
        if (error instanceof Error && error.message.includes('not found')) {
          return errorResponse(ErrorCode.NOT_FOUND, error.message);
        }
        return errorResponse(ErrorCode.DB_ERROR, error instanceof Error ? error.message : 'Failed to get table count');
      }
    }

    // Table endpoints
    const tableSchemaMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)\/schema$/);
    if (tableSchemaMatch && method === 'GET') {
      const tableName = decodeURIComponent(tableSchemaMatch[1]);
      const result = await lancedbService.getTableSchema(tableName);
      return successResponse(result);
    }

    const tableDataMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)\/data$/);
    if (tableDataMatch && method === 'GET') {
      const tableName = decodeURIComponent(tableDataMatch[1]);
      const result = await lancedbService.getTableData(tableName, params as {
        page?: number;
        pageSize?: number;
        sortColumn?: string;
        sortOrder?: 'asc' | 'desc';
        filters?: FilterCondition[];
      });
      return successResponse(result);
    }

    const tableDeleteMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)$/);
    if (tableDeleteMatch && method === 'DELETE') {
      const tableName = decodeURIComponent(tableDeleteMatch[1]);
      const result = await lancedbService.deleteTable(tableName);
      return successResponse(result);
    }

    const tableRenameMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)\/rename$/);
    if (tableRenameMatch && method === 'PUT') {
      const tableName = decodeURIComponent(tableRenameMatch[1]);
      const { newName } = data as { newName: string };
      const result = await lancedbService.renameTable(tableName, newName);
      return successResponse(result);
    }

    // Column endpoints
    const addColumnMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)\/columns$/);
    if (addColumnMatch && method === 'POST') {
      const tableName = decodeURIComponent(addColumnMatch[1]);
      const { name, type, vectorDimension } = data as { name: string; type: string; vectorDimension?: number };
      const result = await lancedbService.addColumn(tableName, name, type, vectorDimension);
      return successResponse(result);
    }

    const dropColumnMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)\/columns\/([^/]+)$/);
    if (dropColumnMatch && method === 'DELETE') {
      const tableName = decodeURIComponent(dropColumnMatch[1]);
      const columnName = decodeURIComponent(dropColumnMatch[2]);
      const result = await lancedbService.dropColumn(tableName, columnName);
      return successResponse(result);
    }

    // Row endpoints
    const deleteRowsMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)\/rows$/);
    if (deleteRowsMatch && method === 'DELETE') {
      const tableName = decodeURIComponent(deleteRowsMatch[1]);
      const { filters, whereClause } = data as { filters?: FilterCondition[]; whereClause?: string };
      const result = await lancedbService.deleteRows(tableName, { filters, whereClause });
      return successResponse(result);
    }

    const deleteRowByIdMatch = endpoint.match(/^\/api\/v1\/tables\/([^/]+)\/rows\/([^/]+)$/);
    if (deleteRowByIdMatch && method === 'DELETE') {
      const tableName = decodeURIComponent(deleteRowByIdMatch[1]);
      const rowId = decodeURIComponent(deleteRowByIdMatch[2]);
      const result = await lancedbService.deleteRowById(tableName, rowId);
      return successResponse(result);
    }

    // Query endpoints
    if (endpoint === '/api/v1/query' && method === 'POST') {
      const { sql, limit } = data as { sql: string; limit?: number };
      const result = await lancedbService.executeQuery(sql, limit);
      return successResponse(result);
    }

    if (endpoint === '/api/v1/query/history' && method === 'GET') {
      // Query history is not persisted in local mode, return empty
      return successResponse({ history: [] });
    }

    // Connection endpoints
    if (endpoint === '/api/v1/connections' && method === 'GET') {
      const connectionService = getConnectionService();
      const connections = await connectionService.getAllConnections();
      return successResponse(connections);
    }

    if (endpoint === '/api/v1/connections' && method === 'POST') {
      const connectionService = getConnectionService();
      try {
        const { name, type, localPath, s3Bucket, s3Region, s3AccessKey, s3SecretKey, s3Endpoint, s3Prefix } = data as {
          name: string;
          type: 'local' | 's3';
          localPath?: string;
          s3Bucket?: string;
          s3Region?: string;
          s3AccessKey?: string;
          s3SecretKey?: string;
          s3Endpoint?: string;
          s3Prefix?: string;
        };

        // Validate required fields
        if (!name || !type) {
          return errorResponse(ErrorCode.PARAMS_ERROR, 'Name and type are required');
        }

        // Validate type
        if (type !== 'local' && type !== 's3') {
          return errorResponse(ErrorCode.PARAMS_ERROR, 'Type must be "local" or "s3"');
        }

        // Validate type-specific fields
        if (type === 'local' && !localPath) {
          return errorResponse(ErrorCode.PARAMS_ERROR, 'Local path is required for local connections');
        }

        if (type === 's3') {
          if (!s3Bucket || !s3Region) {
            return errorResponse(ErrorCode.PARAMS_ERROR, 'S3 bucket and region are required for S3 connections');
          }
        }

        const connection = await connectionService.createConnection({
          name,
          type,
          localPath,
          s3Bucket,
          s3Region,
          s3AccessKey,
          s3SecretKey,
          s3Endpoint,
          s3Prefix,
        });

        return successResponse(connection);
      } catch (error) {
        logError('Create connection error', error);
        if (error instanceof Error && error.message.includes('already exists')) {
          return errorResponse(ErrorCode.PARAMS_ERROR, error.message);
        }
        return errorResponse(ErrorCode.DB_ERROR, error instanceof Error ? error.message : 'Failed to create connection');
      }
    }

    const connectionGetMatch = endpoint.match(/^\/api\/v1\/connections\/([^/]+)$/);
    if (connectionGetMatch && method === 'GET') {
      const connectionService = getConnectionService();
      const id = decodeURIComponent(connectionGetMatch[1]);

      try {
        const connection = await connectionService.getConnectionById(id);
        if (!connection) {
          return errorResponse(ErrorCode.NOT_FOUND, 'Connection not found');
        }
        return successResponse(connection);
      } catch (error) {
        logError('Get connection by ID error', error, { id });
        return errorResponse(ErrorCode.DB_ERROR, error instanceof Error ? error.message : 'Failed to get connection');
      }
    }

    if (connectionGetMatch && method === 'PUT') {
      const connectionService = getConnectionService();
      const id = decodeURIComponent(connectionGetMatch[1]);

      try {
        const { name, type, localPath, s3Bucket, s3Region, s3AccessKey, s3SecretKey, s3Endpoint, s3Prefix } = data as {
          name?: string;
          type?: 'local' | 's3';
          localPath?: string;
          s3Bucket?: string;
          s3Region?: string;
          s3AccessKey?: string;
          s3SecretKey?: string;
          s3Endpoint?: string;
          s3Prefix?: string;
        };

        // Validate type if provided
        if (type && type !== 'local' && type !== 's3') {
          return errorResponse(ErrorCode.PARAMS_ERROR, 'Type must be "local" or "s3"');
        }

        const connection = await connectionService.updateConnection(id, {
          name,
          type,
          localPath,
          s3Bucket,
          s3Region,
          s3AccessKey,
          s3SecretKey,
          s3Endpoint,
          s3Prefix,
        });

        if (!connection) {
          return errorResponse(ErrorCode.NOT_FOUND, 'Connection not found');
        }

        return successResponse(connection);
      } catch (error) {
        logError('Update connection error', error, { id });
        if (error instanceof Error && error.message.includes('already exists')) {
          return errorResponse(ErrorCode.PARAMS_ERROR, error.message);
        }
        return errorResponse(ErrorCode.DB_ERROR, error instanceof Error ? error.message : 'Failed to update connection');
      }
    }

    if (connectionGetMatch && method === 'DELETE') {
      const connectionService = getConnectionService();
      const id = decodeURIComponent(connectionGetMatch[1]);

      try {
        const success = await connectionService.deleteConnection(id);
        if (!success) {
          return errorResponse(ErrorCode.NOT_FOUND, 'Connection not found');
        }
        return successResponse({ deleted: true });
      } catch (error) {
        logError('Delete connection error', error, { id });
        return errorResponse(ErrorCode.DB_ERROR, error instanceof Error ? error.message : 'Failed to delete connection');
      }
    }

    const connectionTestMatch = endpoint.match(/^\/api\/v1\/connections\/([^/]+)\/test$/);
    if (connectionTestMatch && method === 'POST') {
      const connectionService = getConnectionService();
      const id = decodeURIComponent(connectionTestMatch[1]);

      try {
        const result = await connectionService.testConnection(id);
        if (result.success) {
          return successResponse(result);
        } else {
          return errorResponse(ErrorCode.DB_CONNECT_ERROR, result.message);
        }
      } catch (error) {
        logError('Test connection error', error, { id });
        return errorResponse(ErrorCode.DB_ERROR, error instanceof Error ? error.message : 'Failed to test connection');
      }
    }

    // Auth endpoints - authentication removed, return error
    if (endpoint === '/api/v1/auth/login' && method === 'POST') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Authentication is disabled');
    }

    if (endpoint === '/api/v1/auth/me' && method === 'GET') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Authentication is disabled');
    }

    if (endpoint === '/api/v1/auth/logout' && method === 'POST') {
      return successResponse({ success: true });
    }

    // User endpoints - authentication removed, return error
    if (endpoint === '/api/v1/users/profile' && method === 'GET') {
      return errorResponse(ErrorCode.FORBIDDEN, 'Authentication is disabled');
    }

    // Connection-auth endpoints
    if (endpoint === '/api/v1/connection-auth/verify' && method === 'POST') {
      return successResponse({ valid: true, connectionId: 'local' });
    }

    // If no route matched
    console.warn(`[IPC Router] No handler for ${method} ${endpoint}`);
    return errorResponse(ErrorCode.NOT_FOUND, `Endpoint not implemented in local mode: ${method} ${endpoint}`);

  } catch (error) {
    logError(`Error handling ${method} ${endpoint}`, error, { method, endpoint });
    return errorResponse(
      ErrorCode.SYSTEM_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred'
    );
  }
}

/**
 * Register IPC handlers
 */
export function registerIPCHandlers(): void {
  // Handle API requests from renderer
  ipcMain.handle('api:request', async (_event, options: IPCRequestOptions) => {
    return routeRequest(options);
  });

  // Handle database connection
  ipcMain.handle('db:connect', async (_event, dbPath: string) => {
    try {
      const lancedbService = getLanceDBService();
      await lancedbService.connectToDatabase(dbPath);
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      logError('Database connection failed', error, { dbPath });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to database',
      };
    }
  });

  // Handle database disconnect
  ipcMain.handle('db:disconnect', async () => {
    const lancedbService = getLanceDBService();
    await lancedbService.closeConnection();
    return { success: true };
  });

  // Handle test connection
  ipcMain.handle('db:test', async (_event, { path }: { path: string }) => {
    const lancedbService = getLanceDBService();
    return lancedbService.testConnection(path);
  });

  // Handle test S3 connection
  ipcMain.handle('db:testS3', async (_event, config: S3Config) => {
    const lancedbService = getLanceDBService();
    return lancedbService.testS3Connection(config);
  });

  // Handle S3 database connection
  ipcMain.handle('db:connectS3', async (_event, config: S3Config) => {
    try {
      const lancedbService = getLanceDBService();
      const credentialService = getCredentialService();

      // Connect to S3 database
      await lancedbService.connectToS3Database(config);

      // Save credentials securely
      await credentialService.saveS3Config({
        name: config.name || config.bucket,
        bucket: config.bucket,
        region: config.region,
        endpoint: config.endpoint,
        prefix: config.prefix,
        awsAccessKeyId: config.awsAccessKeyId,
        awsSecretAccessKey: config.awsSecretAccessKey,
      });

      return { success: true, message: 'Connected to S3 successfully' };
    } catch (error) {
      logError('S3 database connection failed', error, { bucket: config.bucket, region: config.region });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to S3 database',
      };
    }
  });

  console.log('[IPC Router] Registered IPC handlers');
}

/**
 * Unregister IPC handlers (for cleanup)
 */
export function unregisterIPCHandlers(): void {
  ipcMain.removeHandler('api:request');
  console.log('[IPC Router] Unregistered api:request handler');
}

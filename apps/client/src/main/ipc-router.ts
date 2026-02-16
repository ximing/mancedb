/**
 * IPC Router for handling API requests from the renderer process
 * Maps HTTP-like API calls to native LanceDB operations
 */

import { ipcMain } from 'electron';
import * as lancedbService from './services/lancedb.service';

// IPC request options type (mirrors the one in web app)
interface IPCRequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  data?: unknown;
  params?: Record<string, unknown> | object;
}

// API response format
interface APIResponse<T> {
  code: number;
  data: T;
  message?: string;
}

// Success response helper
function successResponse<T>(data: T): APIResponse<T> {
  return {
    code: 0,
    data,
  };
}

// Error response helper
function errorResponse(message: string, code = -1): APIResponse<null> {
  return {
    code,
    data: null as unknown as null,
    message,
  };
}

/**
 * Route API request to the appropriate handler
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function routeRequest(options: IPCRequestOptions): Promise<APIResponse<any>> {
  const { method, endpoint, data, params } = options;

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
        filters?: lancedbService.FilterCondition[];
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
      const { filters, whereClause } = data as { filters?: lancedbService.FilterCondition[]; whereClause?: string };
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

    // Connection endpoints (for local mode, these are simplified)
    if (endpoint === '/api/v1/connections' && method === 'GET') {
      // Return a single local connection
      return successResponse([{
        id: 'local',
        name: 'Local Database',
        type: 'local',
        path: 'Connected via file dialog',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }]);
    }

    const connectionTestMatch = endpoint.match(/^\/api\/v1\/connections\/([^/]+)\/test$/);
    if (connectionTestMatch && method === 'POST') {
      // Local connection is always "connected" if we have a path
      return successResponse({ success: true, message: 'Local database connected' });
    }

    // Auth endpoints (local mode doesn't require auth)
    if (endpoint === '/api/v1/auth/login' && method === 'POST') {
      // Return a mock successful login for local mode
      return successResponse({
        token: 'local-mode-token',
        user: {
          id: 'local-user',
          username: 'local',
          email: 'local@localhost',
        },
      });
    }

    if (endpoint === '/api/v1/auth/me' && method === 'GET') {
      return successResponse({
        id: 'local-user',
        username: 'local',
        email: 'local@localhost',
      });
    }

    if (endpoint === '/api/v1/auth/logout' && method === 'POST') {
      return successResponse({ success: true });
    }

    // User endpoints
    if (endpoint === '/api/v1/users/profile' && method === 'GET') {
      return successResponse({
        id: 'local-user',
        username: 'local',
        email: 'local@localhost',
        createdAt: new Date().toISOString(),
      });
    }

    // Connection-auth endpoints
    if (endpoint === '/api/v1/connection-auth/verify' && method === 'POST') {
      return successResponse({ valid: true, connectionId: 'local' });
    }

    // If no route matched
    console.warn(`[IPC Router] No handler for ${method} ${endpoint}`);
    return errorResponse(`Endpoint not implemented in local mode: ${method} ${endpoint}`, 404);

  } catch (error) {
    console.error(`[IPC Router] Error handling ${method} ${endpoint}:`, error);
    return errorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
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
      await lancedbService.connectToDatabase(dbPath);
      return { success: true, message: 'Connected successfully' };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to connect to database',
      };
    }
  });

  // Handle database disconnect
  ipcMain.handle('db:disconnect', async () => {
    await lancedbService.closeConnection();
    return { success: true };
  });

  // Handle test connection
  ipcMain.handle('db:test', async (_event, dbPath: string) => {
    return lancedbService.testConnection(dbPath);
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

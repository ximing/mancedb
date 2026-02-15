import type { TableInfo, DatabaseInfo } from '../services/database.service';
import request from '../utils/request';

/**
 * Get all tables in the database
 */
export const getTables = () => {
  return request.get<never, { code: number; data: { tables: TableInfo[]; totalCount: number } }>(
    '/api/v1/database/tables'
  );
};

/**
 * Get database information
 */
export const getDatabaseInfo = () => {
  return request.get<never, { code: number; data: DatabaseInfo }>('/api/v1/database/info');
};

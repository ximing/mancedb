import type { TableInfo, DatabaseInfo } from '../services/database.service';
import { apiClient } from '../utils/api-client';

/**
 * Get all tables in the database
 */
export const getTables = () => {
  return apiClient.get<{ tables: TableInfo[]; totalCount: number }>('/api/v1/database/tables');
};

/**
 * Get database information
 */
export const getDatabaseInfo = () => {
  return apiClient.get<DatabaseInfo>('/api/v1/database/info');
};

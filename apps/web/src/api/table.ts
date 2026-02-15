import type { TableSchema } from '../services/database.service';
import { apiClient } from '../utils/api-client';

/**
 * Get table schema information
 */
export const getTableSchema = (tableName: string) => {
  return apiClient.get<TableSchema>(`/api/v1/tables/${encodeURIComponent(tableName)}/schema`);
};

/**
 * Delete a table
 */
export const deleteTable = (tableName: string) => {
  return apiClient.delete<{ name: string; deleted: boolean }>(`/api/v1/tables/${encodeURIComponent(tableName)}`);
};

/**
 * Rename a table
 */
export const renameTable = (tableName: string, newName: string) => {
  return apiClient.put<{ oldName: string; newName: string }>(
    `/api/v1/tables/${encodeURIComponent(tableName)}/rename`,
    { newName }
  );
};

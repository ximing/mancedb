import type { TableSchema } from '../services/database.service';
import request from '../utils/request';

/**
 * Get table schema information
 */
export const getTableSchema = (tableName: string) => {
  return request.get<never, { code: number; data: TableSchema }>(
    `/api/v1/tables/${encodeURIComponent(tableName)}/schema`
  );
};

/**
 * Delete a table
 */
export const deleteTable = (tableName: string) => {
  return request.delete<never, { code: number; data: { name: string; deleted: boolean }; message?: string }>(
    `/api/v1/tables/${encodeURIComponent(tableName)}`
  );
};

/**
 * Rename a table
 */
export const renameTable = (tableName: string, newName: string) => {
  return request.put<never, { code: number; data: { oldName: string; newName: string }; message?: string }>(
    `/api/v1/tables/${encodeURIComponent(tableName)}/rename`,
    { newName }
  );
};

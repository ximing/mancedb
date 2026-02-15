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

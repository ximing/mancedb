import request from '../utils/request';

export type ColumnType = 'int64' | 'float64' | 'string' | 'binary' | 'vector';

export interface AddColumnRequest {
  name: string;
  type: ColumnType;
  vectorDimension?: number;
}

export interface AddColumnResponse {
  name: string;
  type: string;
  version: number;
}

export interface DropColumnResponse {
  name: string;
  version: number;
}

/**
 * Add a new column to the table
 */
export const addColumn = (tableName: string, data: AddColumnRequest) => {
  return request.post<never, { code: number; data: AddColumnResponse; message?: string }>(
    `/api/v1/tables/${encodeURIComponent(tableName)}/columns`,
    data
  );
};

/**
 * Delete a column from the table
 */
export const dropColumn = (tableName: string, columnName: string) => {
  return request.delete<never, { code: number; data: DropColumnResponse; message?: string }>(
    `/api/v1/tables/${encodeURIComponent(tableName)}/columns/${encodeURIComponent(columnName)}`
  );
};

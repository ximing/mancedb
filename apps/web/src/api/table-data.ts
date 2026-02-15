import { apiClient } from '../utils/api-client';

export type FilterOperator = 'contains' | 'eq' | 'gt' | 'gte' | 'lt' | 'lte';

export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: string | number;
}

export interface TableDataQueryParams {
  page?: number;
  pageSize?: number;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: FilterCondition[];
}

export interface TableDataResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get table data with pagination, sorting, and filtering
 * GET /api/v1/tables/:name/data
 */
export const getTableData = (tableName: string, params: TableDataQueryParams = {}) => {
  return apiClient.get<TableDataResult>(`/api/v1/tables/${encodeURIComponent(tableName)}/data`, params);
};

export interface DeleteRowsRequest {
  filters?: FilterCondition[];
  whereClause?: string;
}

export interface DeleteRowsResult {
  deletedCount: number;
}

/**
 * Delete rows from a table based on filter conditions
 * DELETE /api/v1/tables/:name/rows
 */
export const deleteRows = (tableName: string, body: DeleteRowsRequest) => {
  return apiClient.delete<DeleteRowsResult>(`/api/v1/tables/${encodeURIComponent(tableName)}/rows`, body);
};

/**
 * Delete a single row by ID
 * DELETE /api/v1/tables/:name/rows/:id
 */
export const deleteRowById = (tableName: string, rowId: string | number) => {
  return apiClient.delete<DeleteRowsResult>(
    `/api/v1/tables/${encodeURIComponent(tableName)}/rows/${encodeURIComponent(rowId)}`
  );
};

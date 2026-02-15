import request from '../utils/request';

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
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params.sortColumn) queryParams.set('sortColumn', params.sortColumn);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);
  if (params.filters && params.filters.length > 0) {
    queryParams.set('filters', encodeURIComponent(JSON.stringify(params.filters)));
  }

  const queryString = queryParams.toString();
  const url = `/api/v1/tables/${encodeURIComponent(tableName)}/data${queryString ? `?${queryString}` : ''}`;

  return request.get<never, { code: number; data: TableDataResult }>(url);
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
  const url = `/api/v1/tables/${encodeURIComponent(tableName)}/rows`;
  return request.delete<never, { code: number; data: DeleteRowsResult }>(url, { data: body });
};

/**
 * Delete a single row by ID
 * DELETE /api/v1/tables/:name/rows/:id
 */
export const deleteRowById = (tableName: string, rowId: string | number) => {
  const url = `/api/v1/tables/${encodeURIComponent(tableName)}/rows/${encodeURIComponent(rowId)}`;
  return request.delete<never, { code: number; data: DeleteRowsResult }>(url);
};

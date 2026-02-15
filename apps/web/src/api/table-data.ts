import request from '../utils/request';

export interface TableDataQueryParams {
  page?: number;
  pageSize?: number;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface TableDataResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Get table data with pagination and sorting
 * GET /api/v1/tables/:name/data
 */
export const getTableData = (tableName: string, params: TableDataQueryParams = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.set('page', params.page.toString());
  if (params.pageSize) queryParams.set('pageSize', params.pageSize.toString());
  if (params.sortColumn) queryParams.set('sortColumn', params.sortColumn);
  if (params.sortOrder) queryParams.set('sortOrder', params.sortOrder);

  const queryString = queryParams.toString();
  const url = `/api/v1/tables/${encodeURIComponent(tableName)}/data${queryString ? `?${queryString}` : ''}`;

  return request.get<never, { code: number; data: TableDataResult }>(url);
};

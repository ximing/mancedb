import request from '../utils/request';

export interface ExecuteQueryRequest {
  sql: string;
  limit?: number;
}

export interface ExecuteQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface QueryHistoryEntry {
  id: string;
  sql: string;
  executedAt: number;
  executionTimeMs?: number;
  rowCount?: number;
  error?: string;
}

export interface QueryHistoryResponse {
  history: QueryHistoryEntry[];
}

/**
 * Execute a SQL query
 * POST /api/v1/query
 */
export const executeQuery = (params: ExecuteQueryRequest) => {
  return request.post<never, { code: number; data: ExecuteQueryResult }>('/api/v1/query', params);
};

/**
 * Get query history
 * GET /api/v1/query/history
 */
export const getQueryHistory = (limit: number = 20) => {
  return request.get<never, { code: number; data: QueryHistoryResponse }>(
    `/api/v1/query/history?limit=${limit}`
  );
};

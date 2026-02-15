import { apiClient } from '../utils/api-client';

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
  return apiClient.post<ExecuteQueryResult>('/api/v1/query', params);
};

/**
 * Get query history
 * GET /api/v1/query/history
 */
export const getQueryHistory = (limit: number = 20) => {
  return apiClient.get<QueryHistoryResponse>('/api/v1/query/history', { limit });
};

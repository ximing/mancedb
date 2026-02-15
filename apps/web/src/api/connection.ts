import type {
  ConnectionDto,
  CreateConnectionDto,
  UpdateConnectionDto,
  TestConnectionResponseDto,
} from '@mancedb/dto';
import { apiClient } from '../utils/api-client';

/**
 * Get all connections
 */
export const getConnections = () => {
  return apiClient.get<ConnectionDto[]>('/api/v1/connections');
};

/**
 * Get a single connection by ID
 */
export const getConnection = (id: string) => {
  return apiClient.get<ConnectionDto>(`/api/v1/connections/${id}`);
};

/**
 * Create a new connection
 */
export const createConnection = (data: CreateConnectionDto) => {
  return apiClient.post<ConnectionDto>('/api/v1/connections', data);
};

/**
 * Update a connection
 */
export const updateConnection = (id: string, data: UpdateConnectionDto) => {
  return apiClient.put<ConnectionDto>(`/api/v1/connections/${id}`, data);
};

/**
 * Delete a connection
 */
export const deleteConnection = (id: string) => {
  return apiClient.delete<{ deleted: boolean }>(`/api/v1/connections/${id}`);
};

/**
 * Test a connection
 */
export const testConnection = (id: string) => {
  return apiClient.post<TestConnectionResponseDto>(`/api/v1/connections/${id}/test`);
};

import type {
  ConnectionDto,
  CreateConnectionDto,
  UpdateConnectionDto,
  TestConnectionResponseDto,
} from '@mancedb/dto';
import request from '../utils/request';

/**
 * Get all connections
 */
export const getConnections = () => {
  return request.get<never, { code: number; data: ConnectionDto[] }>(
    '/api/v1/connections'
  );
};

/**
 * Get a single connection by ID
 */
export const getConnection = (id: string) => {
  return request.get<never, { code: number; data: ConnectionDto }>(
    `/api/v1/connections/${id}`
  );
};

/**
 * Create a new connection
 */
export const createConnection = (data: CreateConnectionDto) => {
  return request.post<CreateConnectionDto, { code: number; data: ConnectionDto }>(
    '/api/v1/connections',
    data
  );
};

/**
 * Update a connection
 */
export const updateConnection = (id: string, data: UpdateConnectionDto) => {
  return request.put<UpdateConnectionDto, { code: number; data: ConnectionDto }>(
    `/api/v1/connections/${id}`,
    data
  );
};

/**
 * Delete a connection
 */
export const deleteConnection = (id: string) => {
  return request.delete<never, { code: number; data: { deleted: boolean } }>(
    `/api/v1/connections/${id}`
  );
};

/**
 * Test a connection
 */
export const testConnection = (id: string) => {
  return request.post<
    never,
    { code: number; data: TestConnectionResponseDto }
  >(`/api/v1/connections/${id}/test`);
};

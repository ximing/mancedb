import { Service } from '@rabjs/react';
import type { ConnectionDto, CreateConnectionDto, UpdateConnectionDto } from '@mancedb/dto';
import {
  getConnections as getConnectionsApi,
  getConnection as getConnectionApi,
  createConnection as createConnectionApi,
  updateConnection as updateConnectionApi,
  deleteConnection as deleteConnectionApi,
  testConnection as testConnectionApi,
} from '../api/connection';

export class ConnectionService extends Service {
  connections: ConnectionDto[] = [];
  currentConnection: ConnectionDto | null = null;
  isLoading = false;
  error: string | null = null;

  /**
   * Load all connections
   */
  async loadConnections(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await getConnectionsApi();
      if (response.code === 0) {
        this.connections = response.data;
      } else {
        this.error = 'Failed to load connections';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load connections';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Get a single connection by ID
   */
  async loadConnection(id: string): Promise<ConnectionDto | null> {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await getConnectionApi(id);
      if (response.code === 0) {
        this.currentConnection = response.data;
        return response.data;
      } else {
        this.error = 'Failed to load connection';
        return null;
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load connection';
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Create a new connection
   */
  async createConnection(data: CreateConnectionDto): Promise<ConnectionDto | null> {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await createConnectionApi(data);
      console.warn('response',response)
      if (response.code === 0) {
        this.connections.push(response.data);
        return response.data;
      } else {
        this.error = 'Failed to create connection';
        return null;
      }
    } catch (err) {
      console.error(err);
      this.error = err instanceof Error ? err.message : 'Failed to create connection';
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Update a connection
   */
  async updateConnection(id: string, data: UpdateConnectionDto): Promise<ConnectionDto | null> {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await updateConnectionApi(id, data);
      if (response.code === 0) {
        const index = this.connections.findIndex(c => c.id === id);
        if (index !== -1) {
          this.connections[index] = response.data;
        }
        if (this.currentConnection?.id === id) {
          this.currentConnection = response.data;
        }
        return response.data;
      } else {
        this.error = 'Failed to update connection';
        return null;
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to update connection';
      return null;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(id: string): Promise<boolean> {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await deleteConnectionApi(id);
      if (response.code === 0 && response.data.deleted) {
        this.connections = this.connections.filter(c => c.id !== id);
        if (this.currentConnection?.id === id) {
          this.currentConnection = null;
        }
        return true;
      } else {
        this.error = 'Failed to delete connection';
        return false;
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to delete connection';
      return false;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Test a connection
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await testConnectionApi(id);
      if (response.code === 0) {
        return response.data;
      } else {
        return { success: false, message: 'Test failed' };
      }
    } catch (err) {
      return {
        success: false,
        message: err instanceof Error ? err.message : 'Test failed',
      };
    }
  }

  /**
   * Filter connections by search term
   */
  getFilteredConnections(searchTerm: string): ConnectionDto[] {
    if (!searchTerm.trim()) {
      return this.connections;
    }
    const term = searchTerm.toLowerCase();
    return this.connections.filter(
      c =>
        c.name.toLowerCase().includes(term) ||
        c.type.toLowerCase().includes(term) ||
        (c.localPath && c.localPath.toLowerCase().includes(term)) ||
        (c.s3Bucket && c.s3Bucket.toLowerCase().includes(term))
    );
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * Get a connection by ID without setting loading state
   * Useful for loading connection details without affecting UI loading state
   */
  async getConnectionById(id: string): Promise<ConnectionDto | null> {
    try {
      const response = await getConnectionApi(id);
      if (response.code === 0) {
        return response.data;
      }
      return null;
    } catch {
      return null;
    }
  }
}

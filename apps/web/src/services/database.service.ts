import { Service } from '@rabjs/react';
import { getTables, getDatabaseInfo } from '../api/database';
import { getTableSchema } from '../api/table';

export interface TableInfo {
  name: string;
  rowCount: number;
  sizeBytes: number;
}

export interface DatabaseInfo {
  name: string;
  type: 'local' | 's3';
  path: string;
  tableCount: number;
  tables: TableInfo[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  vectorDimension?: number;
}

export interface TableSchema {
  name: string;
  columns: ColumnInfo[];
  rowCount: number;
  sizeBytes: number;
}

export class DatabaseService extends Service {
  tables: TableInfo[] = [];
  databaseInfo: DatabaseInfo | null = null;
  isLoading = false;
  error: string | null = null;
  selectedTable: string | null = null;
  sidebarCollapsed = false;

  // Table schema state
  currentSchema: TableSchema | null = null;
  isLoadingSchema = false;
  schemaError: string | null = null;
  activeTab: 'schema' | 'data' = 'schema';

  /**
   * Load all tables from the database
   */
  async loadTables(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await getTables();
      if (response.code === 0) {
        this.tables = response.data.tables;
      } else {
        this.error = 'Failed to load tables';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load tables';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Load database information
   */
  async loadDatabaseInfo(): Promise<void> {
    this.isLoading = true;
    this.error = null;
    try {
      const response = await getDatabaseInfo();
      if (response.code === 0) {
        this.databaseInfo = response.data;
        this.tables = response.data.tables;
      } else {
        this.error = 'Failed to load database info';
      }
    } catch (err) {
      this.error = err instanceof Error ? err.message : 'Failed to load database info';
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Select a table
   */
  selectTable(tableName: string | null): void {
    this.selectedTable = tableName;
  }

  /**
   * Toggle sidebar collapsed state
   */
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  /**
   * Set sidebar collapsed state
   */
  setSidebarCollapsed(collapsed: boolean): void {
    this.sidebarCollapsed = collapsed;
  }

  /**
   * Clear error state
   */
  clearError(): void {
    this.error = null;
  }

  /**
   * Refresh all data
   */
  async refresh(): Promise<void> {
    await this.loadDatabaseInfo();
  }

  /**
   * Load table schema
   */
  async loadTableSchema(tableName: string): Promise<void> {
    this.isLoadingSchema = true;
    this.schemaError = null;
    try {
      const response = await getTableSchema(tableName);
      if (response.code === 0) {
        this.currentSchema = response.data;
      } else {
        this.schemaError = 'Failed to load table schema';
      }
    } catch (err) {
      this.schemaError = err instanceof Error ? err.message : 'Failed to load table schema';
    } finally {
      this.isLoadingSchema = false;
    }
  }

  /**
   * Refresh table schema
   */
  async refreshTableSchema(): Promise<void> {
    if (this.selectedTable) {
      await this.loadTableSchema(this.selectedTable);
    }
  }

  /**
   * Clear schema error
   */
  clearSchemaError(): void {
    this.schemaError = null;
  }

  /**
   * Set active tab
   */
  setActiveTab(tab: 'schema' | 'data'): void {
    this.activeTab = tab;
  }

  /**
   * Format bytes to human readable string
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();

import { Service } from '@rabjs/react';
import { getTables, getDatabaseInfo } from '../api/database';

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

export class DatabaseService extends Service {
  tables: TableInfo[] = [];
  databaseInfo: DatabaseInfo | null = null;
  isLoading = false;
  error: string | null = null;
  selectedTable: string | null = null;
  sidebarCollapsed = false;

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
}

// Export singleton instance
export const databaseService = new DatabaseService();

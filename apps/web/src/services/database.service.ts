import { Service } from '@rabjs/react';
import { getTables, getDatabaseInfo } from '../api/database';
import { getTableSchema, deleteTable, renameTable } from '../api/table';
import { getTableData, deleteRows, deleteRowById, type TableDataResult, type FilterCondition, type FilterOperator } from '../api/table-data';
import { executeQuery, getQueryHistory, type ExecuteQueryResult, type QueryHistoryEntry } from '../api/query';
import { addColumn, dropColumn, type AddColumnRequest, type ColumnType } from '../api/table-schema';

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

export interface TableDataState extends TableDataResult {
  isLoading: boolean;
  error: string | null;
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
  activeTab: 'schema' | 'data' | 'query' = 'schema';

  // Table data state
  tableData: TableDataState = {
    rows: [],
    totalCount: 0,
    page: 1,
    pageSize: 50,
    totalPages: 0,
    isLoading: false,
    error: null,
  };

  // Sorting state
  sortColumn: string | null = null;
  sortOrder: 'asc' | 'desc' = 'asc';

  // Filter state
  filters: FilterCondition[] = [];

  // SQL Query state
  sqlQuery = '';
  queryResult: ExecuteQueryResult & { isLoading: boolean; error: string | null } = {
    rows: [],
    rowCount: 0,
    executionTimeMs: 0,
    isLoading: false,
    error: null,
  };
  queryHistory: QueryHistoryEntry[] = [];
  isLoadingHistory = false;
  historyError: string | null = null;

  // Column management state
  isAddingColumn = false;
  isDroppingColumn = false;
  columnError: string | null = null;
  columnSuccessMessage: string | null = null;

  // Table management state
  isDeletingTable = false;
  isRenamingTable = false;
  tableError: string | null = null;
  tableSuccessMessage: string | null = null;

  // Row deletion state
  isDeletingRows = false;
  rowDeleteError: string | null = null;
  rowDeleteSuccessMessage: string | null = null;
  selectedRowIds: Set<string | number> = new Set();

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
  setActiveTab(tab: 'schema' | 'data' | 'query'): void {
    this.activeTab = tab;
    // Load data when switching to data tab if not already loaded
    if (tab === 'data' && this.selectedTable && this.tableData.rows.length === 0) {
      this.loadTableData();
    }
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

  /**
   * Load table data with pagination and filters
   */
  async loadTableData(page?: number, pageSize?: number): Promise<void> {
    if (!this.selectedTable) return;

    const targetPage = page ?? this.tableData.page;
    const targetPageSize = pageSize ?? this.tableData.pageSize;

    this.tableData.isLoading = true;
    this.tableData.error = null;

    try {
      const response = await getTableData(this.selectedTable, {
        page: targetPage,
        pageSize: targetPageSize,
        sortColumn: this.sortColumn ?? undefined,
        sortOrder: this.sortOrder,
        filters: this.filters.length > 0 ? this.filters : undefined,
      });

      if (response.code === 0) {
        this.tableData.rows = response.data.rows;
        this.tableData.totalCount = response.data.totalCount;
        this.tableData.page = response.data.page;
        this.tableData.pageSize = response.data.pageSize;
        this.tableData.totalPages = response.data.totalPages;
      } else {
        this.tableData.error = 'Failed to load table data';
      }
    } catch (err) {
      this.tableData.error = err instanceof Error ? err.message : 'Failed to load table data';
    } finally {
      this.tableData.isLoading = false;
    }
  }

  /**
   * Change page
   */
  async changePage(page: number): Promise<void> {
    if (page < 1 || page > this.tableData.totalPages) return;
    await this.loadTableData(page);
  }

  /**
   * Change page size
   */
  async changePageSize(pageSize: number): Promise<void> {
    await this.loadTableData(1, pageSize);
  }

  /**
   * Set sorting
   */
  async setSorting(column: string | null, order: 'asc' | 'desc'): Promise<void> {
    this.sortColumn = column;
    this.sortOrder = order;
    await this.loadTableData(1);
  }

  /**
   * Toggle sort for a column
   */
  async toggleSort(column: string): Promise<void> {
    if (this.sortColumn === column) {
      // Toggle order
      await this.setSorting(column, this.sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to asc
      await this.setSorting(column, 'asc');
    }
  }

  /**
   * Refresh table data
   */
  async refreshTableData(): Promise<void> {
    await this.loadTableData();
  }

  /**
   * Clear table data error
   */
  clearTableDataError(): void {
    this.tableData.error = null;
  }

  /**
   * Add a filter condition
   */
  addFilter(filter: FilterCondition): void {
    // Remove existing filter for the same column and operator
    this.filters = this.filters.filter(
      f => !(f.column === filter.column && f.operator === filter.operator)
    );
    this.filters.push(filter);
  }

  /**
   * Remove a filter condition
   */
  removeFilter(column: string, operator: FilterOperator): void {
    this.filters = this.filters.filter(
      f => !(f.column === column && f.operator === operator)
    );
  }

  /**
   * Remove all filters for a column
   */
  removeColumnFilters(column: string): void {
    this.filters = this.filters.filter(f => f.column !== column);
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters = [];
  }

  /**
   * Apply filters and reload data
   */
  async applyFilters(): Promise<void> {
    await this.loadTableData(1);
  }

  /**
   * Get filter value for a column
   */
  getFilterValue(column: string, operator: FilterOperator): string | number | undefined {
    const filter = this.filters.find(f => f.column === column && f.operator === operator);
    return filter?.value;
  }

  /**
   * Check if a column has active filters
   */
  hasFilter(column: string): boolean {
    return this.filters.some(f => f.column === column);
  }

  /**
   * Set SQL query
   */
  setSqlQuery(query: string): void {
    this.sqlQuery = query;
  }

  /**
   * Execute SQL query
   */
  async executeQuery(limit?: number): Promise<void> {
    if (!this.sqlQuery.trim()) {
      this.queryResult.error = 'Please enter a SQL query';
      return;
    }

    this.queryResult.isLoading = true;
    this.queryResult.error = null;

    try {
      const response = await executeQuery({
        sql: this.sqlQuery,
        limit,
      });

      if (response.code === 0) {
        this.queryResult.rows = response.data.rows;
        this.queryResult.rowCount = response.data.rowCount;
        this.queryResult.executionTimeMs = response.data.executionTimeMs;
      } else {
        this.queryResult.error = 'Failed to execute query';
      }
    } catch (err) {
      this.queryResult.error = err instanceof Error ? err.message : 'Failed to execute query';
    } finally {
      this.queryResult.isLoading = false;
    }
  }

  /**
   * Clear query error
   */
  clearQueryError(): void {
    this.queryResult.error = null;
  }

  /**
   * Clear query results
   */
  clearQueryResults(): void {
    this.queryResult.rows = [];
    this.queryResult.rowCount = 0;
    this.queryResult.executionTimeMs = 0;
    this.queryResult.error = null;
  }

  /**
   * Load query history
   */
  async loadQueryHistory(limit?: number): Promise<void> {
    this.isLoadingHistory = true;
    this.historyError = null;

    try {
      const response = await getQueryHistory(limit);
      if (response.code === 0) {
        this.queryHistory = response.data.history;
      } else {
        this.historyError = 'Failed to load query history';
      }
    } catch (err) {
      this.historyError = err instanceof Error ? err.message : 'Failed to load query history';
    } finally {
      this.isLoadingHistory = false;
    }
  }

  /**
   * Set SQL query from history
   */
  loadQueryFromHistory(entry: QueryHistoryEntry): void {
    this.sqlQuery = entry.sql;
  }

  /**
   * Format SQL query with basic formatting
   */
  formatSql(): void {
    // Basic SQL formatting
    let formatted = this.sqlQuery
      .replace(/\s+/g, ' ')
      .replace(/\s*,\s*/g, ', ')
      .replace(/\s*\(\s*/g, ' (')
      .replace(/\s*\)\s*/g, ') ')
      .replace(/\s*[=]\s*/g, ' = ')
      .replace(/\s+FROM\s+/gi, '\nFROM ')
      .replace(/\s+WHERE\s+/gi, '\nWHERE ')
      .replace(/\s+ORDER\s+BY\s+/gi, '\nORDER BY ')
      .replace(/\s+LIMIT\s+/gi, '\nLIMIT ')
      .replace(/\s+AND\s+/gi, '\n  AND ')
      .replace(/\s+OR\s+/gi, '\n  OR ')
      .trim();

    // Capitalize keywords
    const keywords = ['SELECT', 'FROM', 'WHERE', 'ORDER BY', 'LIMIT', 'AND', 'OR', 'ASC', 'DESC'];
    keywords.forEach(keyword => {
      const regex = new RegExp("\\b" + keyword + "\\b", 'gi');
      formatted = formatted.replace(regex, keyword);
    });

    this.sqlQuery = formatted;
  }

  /**
   * Clear column error and success messages
   */
  clearColumnMessages(): void {
    this.columnError = null;
    this.columnSuccessMessage = null;
  }

  /**
   * Add a new column to the current table
   */
  async addColumnToTable(tableName: string, name: string, type: ColumnType, vectorDimension?: number): Promise<boolean> {
    this.isAddingColumn = true;
    this.columnError = null;
    this.columnSuccessMessage = null;

    try {
      const request: AddColumnRequest = {
        name: name.trim(),
        type,
        vectorDimension: type === 'vector' ? vectorDimension : undefined,
      };

      const response = await addColumn(tableName, request);

      if (response.code === 0) {
        this.columnSuccessMessage = `Column '${name}' added successfully`;
        // Refresh the schema to show the new column
        await this.refreshTableSchema();
        return true;
      } else {
        this.columnError = response.message || 'Failed to add column';
        return false;
      }
    } catch (err) {
      this.columnError = err instanceof Error ? err.message : 'Failed to add column';
      return false;
    } finally {
      this.isAddingColumn = false;
    }
  }

  /**
   * Drop a column from the current table
   */
  async dropColumnFromTable(tableName: string, columnName: string): Promise<boolean> {
    this.isDroppingColumn = true;
    this.columnError = null;
    this.columnSuccessMessage = null;

    try {
      const response = await dropColumn(tableName, columnName);

      if (response.code === 0) {
        this.columnSuccessMessage = `Column '${columnName}' deleted successfully`;
        // Refresh the schema to show the updated columns
        await this.refreshTableSchema();
        return true;
      } else {
        this.columnError = response.message || 'Failed to delete column';
        return false;
      }
    } catch (err) {
      this.columnError = err instanceof Error ? err.message : 'Failed to delete column';
      return false;
    } finally {
      this.isDroppingColumn = false;
    }
  }

  /**
   * Clear table error and success messages
   */
  clearTableMessages(): void {
    this.tableError = null;
    this.tableSuccessMessage = null;
  }

  /**
   * Delete a table
   */
  async deleteTable(tableName: string): Promise<boolean> {
    this.isDeletingTable = true;
    this.tableError = null;
    this.tableSuccessMessage = null;

    try {
      const response = await deleteTable(tableName);

      if (response.code === 0) {
        this.tableSuccessMessage = `Table '${tableName}' deleted successfully`;
        // Remove from tables list
        this.tables = this.tables.filter(t => t.name !== tableName);
        // Clear selected table if it was the deleted one
        if (this.selectedTable === tableName) {
          this.selectedTable = null;
          this.currentSchema = null;
        }
        return true;
      } else {
        this.tableError = response.message || 'Failed to delete table';
        return false;
      }
    } catch (err) {
      this.tableError = err instanceof Error ? err.message : 'Failed to delete table';
      return false;
    } finally {
      this.isDeletingTable = false;
    }
  }

  /**
   * Rename a table
   */
  async renameTable(tableName: string, newName: string): Promise<boolean> {
    this.isRenamingTable = true;
    this.tableError = null;
    this.tableSuccessMessage = null;

    try {
      const response = await renameTable(tableName, newName);

      if (response.code === 0) {
        this.tableSuccessMessage = `Table renamed from '${tableName}' to '${newName}'`;
        // Update tables list
        const tableIndex = this.tables.findIndex(t => t.name === tableName);
        if (tableIndex !== -1) {
          this.tables[tableIndex].name = newName;
        }
        // Update selected table if it was the renamed one
        if (this.selectedTable === tableName) {
          this.selectedTable = newName;
          if (this.currentSchema) {
            this.currentSchema.name = newName;
          }
        }
        return true;
      } else {
        this.tableError = response.message || 'Failed to rename table';
        return false;
      }
    } catch (err) {
      this.tableError = err instanceof Error ? err.message : 'Failed to rename table';
      return false;
    } finally {
      this.isRenamingTable = false;
    }
  }

  /**
   * Clear row deletion error and success messages
   */
  clearRowDeleteMessages(): void {
    this.rowDeleteError = null;
    this.rowDeleteSuccessMessage = null;
  }

  /**
   * Toggle selection of a row
   */
  toggleRowSelection(rowId: string | number): void {
    if (this.selectedRowIds.has(rowId)) {
      this.selectedRowIds.delete(rowId);
    } else {
      this.selectedRowIds.add(rowId);
    }
  }

  /**
   * Select all rows on the current page
   */
  selectAllRowsOnPage(rowIds: (string | number)[]): void {
    rowIds.forEach(id => this.selectedRowIds.add(id));
  }

  /**
   * Deselect all rows on the current page
   */
  deselectAllRowsOnPage(rowIds: (string | number)[]): void {
    rowIds.forEach(id => this.selectedRowIds.delete(id));
  }

  /**
   * Clear all row selections
   */
  clearRowSelection(): void {
    this.selectedRowIds.clear();
  }

  /**
   * Check if a row is selected
   */
  isRowSelected(rowId: string | number): boolean {
    return this.selectedRowIds.has(rowId);
  }

  /**
   * Get selected row count
   */
  get selectedRowCount(): number {
    return this.selectedRowIds.size;
  }

  /**
   * Delete selected rows by their IDs
   */
  async deleteSelectedRows(tableName: string): Promise<number> {
    if (this.selectedRowIds.size === 0) {
      this.rowDeleteError = 'No rows selected';
      return 0;
    }

    this.isDeletingRows = true;
    this.rowDeleteError = null;
    this.rowDeleteSuccessMessage = null;

    let totalDeleted = 0;

    try {
      // Delete rows one by one
      for (const rowId of this.selectedRowIds) {
        const response = await deleteRowById(tableName, rowId);
        if (response.code === 0) {
          totalDeleted += response.data.deletedCount;
        }
      }

      this.rowDeleteSuccessMessage = `${totalDeleted} row${totalDeleted !== 1 ? 's' : ''} deleted successfully`;
      this.selectedRowIds.clear();
      // Refresh table data to show updated rows
      await this.loadTableData();
      // Refresh schema to update row count
      await this.refreshTableSchema();
      // Refresh database info
      await this.loadDatabaseInfo();
      return totalDeleted;
    } catch (err) {
      this.rowDeleteError = err instanceof Error ? err.message : 'Failed to delete rows';
      return 0;
    } finally {
      this.isDeletingRows = false;
    }
  }

  /**
   * Delete rows by filter conditions (bulk delete)
   */
  async deleteRowsByFilter(tableName: string): Promise<number> {
    if (this.filters.length === 0) {
      this.rowDeleteError = 'No filters applied. Apply filters to select rows for deletion.';
      return 0;
    }

    this.isDeletingRows = true;
    this.rowDeleteError = null;
    this.rowDeleteSuccessMessage = null;

    try {
      const response = await deleteRows(tableName, { filters: this.filters });

      if (response.code === 0) {
        const deletedCount = response.data.deletedCount;
        this.rowDeleteSuccessMessage = `${deletedCount} row${deletedCount !== 1 ? 's' : ''} deleted successfully`;
        // Clear filters after bulk delete
        this.clearFilters();
        // Refresh table data
        await this.loadTableData();
        // Refresh schema to update row count
        await this.refreshTableSchema();
        // Refresh database info
        await this.loadDatabaseInfo();
        return deletedCount;
      } else {
        this.rowDeleteError = 'Failed to delete rows';
        return 0;
      }
    } catch (err) {
      this.rowDeleteError = err instanceof Error ? err.message : 'Failed to delete rows';
      return 0;
    } finally {
      this.isDeletingRows = false;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();

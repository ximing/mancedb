/**
 * LanceDB Service for Electron Main Process
 * Provides native LanceDB database operations via Node.js SDK
 */

import * as lancedb from 'vectordb';
import type { Connection } from 'vectordb';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Types matching the web API expectations
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

export interface TableDataResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface FilterCondition {
  column: string;
  operator: 'contains' | 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
  value: string | number;
}

export interface ExecuteQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

// Active connection cache
let activeConnection: Connection | null = null;
let activeDbPath: string | null = null;

/**
 * Get or create a connection to a LanceDB database
 */
export async function connectToDatabase(dbPath: string): Promise<Connection> {
  // Return cached connection if same path
  if (activeConnection && activeDbPath === dbPath) {
    return activeConnection;
  }

  // Close existing connection if different path
  if (activeConnection) {
    await closeConnection();
  }

  // Validate path exists
  if (!fs.existsSync(dbPath)) {
    throw new Error(`Database path does not exist: ${dbPath}`);
  }

  // Check if path is a directory (LanceDB database folder)
  const stats = fs.statSync(dbPath);
  if (!stats.isDirectory()) {
    throw new Error(`Database path must be a directory: ${dbPath}`);
  }

  try {
    // Connect to the database
    const conn = await lancedb.connect(dbPath);
    activeConnection = conn;
    activeDbPath = dbPath;
    return conn;
  } catch (error) {
    throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Close the active connection
 */
export async function closeConnection(): Promise<void> {
  if (activeConnection) {
    // LanceDB doesn't have explicit close, but we clear the reference
    activeConnection = null;
    activeDbPath = null;
  }
}

/**
 * Get the active connection or throw error
 */
function getActiveConnection(): Connection {
  if (!activeConnection) {
    throw new Error('No active database connection. Please connect to a database first.');
  }
  return activeConnection;
}

/**
 * Get database information
 */
export async function getDatabaseInfo(dbPath?: string): Promise<DatabaseInfo> {
  const conn = dbPath ? await connectToDatabase(dbPath) : getActiveConnection();
  const databasePath = dbPath || activeDbPath!;

  try {
    const tableNames = await conn.tableNames();
    const tables: TableInfo[] = [];

    for (const name of tableNames) {
      try {
        const table = await conn.openTable(name);
        const count = await table.countRows();

        // Calculate size by looking at the table directory
        const tablePath = path.join(databasePath, `${name}.lance`);
        let sizeBytes = 0;
        if (fs.existsSync(tablePath)) {
          sizeBytes = getDirectorySize(tablePath);
        }

        tables.push({
          name,
          rowCount: count,
          sizeBytes,
        });
      } catch (err) {
        console.warn(`Failed to get info for table ${name}:`, err);
        tables.push({
          name,
          rowCount: 0,
          sizeBytes: 0,
        });
      }
    }

    return {
      name: path.basename(databasePath),
      type: 'local',
      path: databasePath,
      tableCount: tables.length,
      tables,
    };
  } catch (error) {
    throw new Error(`Failed to get database info: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get all tables in the database
 */
export async function getTables(dbPath?: string): Promise<{ tables: TableInfo[]; totalCount: number }> {
  const info = await getDatabaseInfo(dbPath);
  return {
    tables: info.tables,
    totalCount: info.tables.length,
  };
}

/**
 * Get table schema
 */
export async function getTableSchema(tableName: string, dbPath?: string): Promise<TableSchema> {
  const conn = dbPath ? await connectToDatabase(dbPath) : getActiveConnection();

  try {
    const table = await conn.openTable(tableName);
    const schema = await table.schema;
    const count = await table.countRows();

    // Calculate size
    const databasePath = dbPath || activeDbPath!;
    const tablePath = path.join(databasePath, `${tableName}.lance`);
    let sizeBytes = 0;
    if (fs.existsSync(tablePath)) {
      sizeBytes = getDirectorySize(tablePath);
    }

    // Convert Arrow schema to column info
    const columns: ColumnInfo[] = schema.fields.map((field: { name: string; type: { toString: () => string }; nullable: boolean }) => {
      const typeStr = field.type.toString();
      let columnType = typeStr;
      let vectorDimension: number | undefined;

      // Detect vector type (fixed size list)
      if (typeStr.includes('fixed_size_list')) {
        columnType = 'vector';
        // Extract dimension from type string like "fixed_size_list<item: float, 384>"
        const match = typeStr.match(/fixed_size_list<[^,]+,\s*(\d+)>/);
        if (match) {
          vectorDimension = parseInt(match[1], 10);
        }
      } else if (typeStr.includes('int')) {
        columnType = 'int64';
      } else if (typeStr.includes('float')) {
        columnType = 'float64';
      } else if (typeStr.includes('utf8') || typeStr.includes('string')) {
        columnType = 'string';
      } else if (typeStr.includes('binary')) {
        columnType = 'binary';
      }

      return {
        name: field.name,
        type: columnType,
        nullable: field.nullable,
        vectorDimension,
      };
    });

    return {
      name: tableName,
      columns,
      rowCount: count,
      sizeBytes,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('Table not found')) {
      throw new Error(`Table '${tableName}' not found`);
    }
    throw new Error(`Failed to get table schema: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get table data with pagination
 */
export async function getTableData(
  tableName: string,
  options: {
    page?: number;
    pageSize?: number;
    sortColumn?: string;
    sortOrder?: 'asc' | 'desc';
    filters?: FilterCondition[];
  } = {},
  dbPath?: string
): Promise<TableDataResult> {
  const conn = dbPath ? await connectToDatabase(dbPath) : getActiveConnection();

  const page = options.page || 1;
  const pageSize = options.pageSize || 50;

  try {
    const table = await conn.openTable(tableName);
    const totalCount = await table.countRows();

    // Build query using search API
    // We use a dummy vector for search since we want all data
    // LanceDB requires a search vector, so we use an empty query approach
    const query = table.search([]);

    // Apply filters if provided
    if (options.filters && options.filters.length > 0) {
      const whereClause = buildWhereClause(options.filters);
      if (whereClause) {
        query.filter(whereClause);
      }
    }

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query.limit(pageSize + offset);

    // Execute query
    const startTime = Date.now();
    const results = await query.execute<Record<string, unknown>>();
    const executionTimeMs = Date.now() - startTime;
    console.log(`[LanceDB] Query executed in ${executionTimeMs}ms`);

    // Skip to the correct page
    const pageResults = results.slice(offset, offset + pageSize);

    // Apply sorting in memory if needed (since LanceDB search doesn't support orderBy directly)
    if (options.sortColumn) {
      pageResults.sort((a, b) => {
        const aVal = a[options.sortColumn!];
        const bVal = b[options.sortColumn!];
        if (aVal === undefined || bVal === undefined) return 0;
        if (aVal === null || bVal === null) return 0;
        if (aVal < bVal) return options.sortOrder === 'desc' ? 1 : -1;
        if (aVal > bVal) return options.sortOrder === 'desc' ? -1 : 1;
        return 0;
      });
    }

    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      rows: pageResults,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  } catch (error) {
    throw new Error(`Failed to get table data: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a table
 */
export async function deleteTable(tableName: string, dbPath?: string): Promise<{ name: string; deleted: boolean }> {
  const conn = dbPath ? await connectToDatabase(dbPath) : getActiveConnection();

  try {
    await conn.dropTable(tableName);
    return { name: tableName, deleted: true };
  } catch (error) {
    throw new Error(`Failed to delete table: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Rename a table (LanceDB doesn't support rename directly, so we copy and delete)
 */
export async function renameTable(
  tableName: string,
  newName: string,
  dbPath?: string
): Promise<{ oldName: string; newName: string }> {
  const conn = dbPath ? await connectToDatabase(dbPath) : getActiveConnection();

  try {
    // Check if source table exists
    const tableNames = await conn.tableNames();
    if (!tableNames.includes(tableName)) {
      throw new Error(`Table '${tableName}' not found`);
    }

    // Check if target name already exists
    if (tableNames.includes(newName)) {
      throw new Error(`Table '${newName}' already exists`);
    }

    // LanceDB doesn't have a native rename, so we need to:
    // 1. Open the source table
    // 2. Create a new table with the same data
    // 3. Drop the old table
    const sourceTable = await conn.openTable(tableName);
    const data = await sourceTable.search([]).execute();
    await conn.createTable(newName, data);
    await conn.dropTable(tableName);

    return { oldName: tableName, newName };
  } catch (error) {
    throw new Error(`Failed to rename table: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Execute a SQL query (limited support for basic queries)
 */
export async function executeQuery(
  sql: string,
  _limit?: number,
  dbPath?: string
): Promise<ExecuteQueryResult> {
  const conn = dbPath ? await connectToDatabase(dbPath) : getActiveConnection();

  const startTime = Date.now();

  try {
    // Parse basic SELECT * FROM table_name queries
    // This is a simplified implementation - full SQL parsing would require a proper parser
    const selectMatch = sql.match(/^\s*SELECT\s+\*\s+FROM\s+(\w+)\s*/i);
    if (selectMatch) {
      const tableName = selectMatch[1];
      const table = await conn.openTable(tableName);
      const results = await table.search([]).execute<Record<string, unknown>>();

      return {
        rows: results,
        rowCount: results.length,
        executionTimeMs: Date.now() - startTime,
      };
    }

    // For other queries, return empty result with error
    throw new Error('Only basic SELECT * FROM table queries are supported in local mode');
  } catch (error) {
    throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete rows from a table
 */
export async function deleteRows(
  tableName: string,
  options: {
    filters?: FilterCondition[];
    whereClause?: string;
  },
  dbPath?: string
): Promise<{ deletedCount: number }> {
  const conn = dbPath ? await connectToDatabase(dbPath) : getActiveConnection();

  try {
    const table = await conn.openTable(tableName);

    let whereClause = options.whereClause;
    if (!whereClause && options.filters && options.filters.length > 0) {
      whereClause = buildWhereClause(options.filters);
    }

    if (!whereClause) {
      throw new Error('No filter conditions provided for delete operation');
    }

    // Get count before delete
    const beforeCount = await table.countRows();

    // Delete rows matching the filter
    await table.delete(whereClause);

    // Get count after delete
    const afterCount = await table.countRows();

    return { deletedCount: beforeCount - afterCount };
  } catch (error) {
    throw new Error(`Failed to delete rows: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Delete a single row by ID
 */
export async function deleteRowById(
  tableName: string,
  rowId: string | number,
  dbPath?: string
): Promise<{ deletedCount: number }> {
  // Try to delete by common ID column names
  const idColumns = ['id', '_id', 'row_id', 'pk'];

  for (const idCol of idColumns) {
    try {
      const result = await deleteRows(
        tableName,
        { whereClause: `${idCol} = ${typeof rowId === 'string' ? `'${rowId}'` : rowId}` },
        dbPath
      );
      if (result.deletedCount > 0) {
        return result;
      }
    } catch {
      // Try next column name
      continue;
    }
  }

  throw new Error(`Could not delete row with ID '${rowId}'. No valid ID column found.`);
}

/**
 * Add a column to a table (LanceDB doesn't support adding columns to existing tables)
 * This would require recreating the table
 */
export async function addColumn(
  tableName: string,
  columnName: string,
  columnType: string,
  vectorDimension?: number,
  dbPath?: string
): Promise<{ name: string; type: string; version: number }> {
  // LanceDB doesn't support adding columns to existing tables
  void tableName; void columnName; void columnType; void vectorDimension; void dbPath;
  throw new Error('Adding columns to existing tables is not supported in LanceDB. Create a new table with the desired schema instead.');
}

/**
 * Drop a column from a table (LanceDB doesn't support dropping columns)
 */
export async function dropColumn(
  tableName: string,
  columnName: string,
  dbPath?: string
): Promise<{ name: string; version: number }> {
  // LanceDB doesn't support dropping columns from existing tables
  void tableName; void columnName; void dbPath;
  throw new Error('Dropping columns from existing tables is not supported in LanceDB. Create a new table with the desired schema instead.');
}

/**
 * Build a where clause from filter conditions
 */
function buildWhereClause(filters: FilterCondition[]): string {
  const conditions = filters.map((filter) => {
    const { column, operator, value } = filter;

    switch (operator) {
      case 'eq':
        return `${column} = ${typeof value === 'string' ? `'${value}'` : value}`;
      case 'gt':
        return `${column} > ${value}`;
      case 'gte':
        return `${column} >= ${value}`;
      case 'lt':
        return `${column} < ${value}`;
      case 'lte':
        return `${column} <= ${value}`;
      case 'contains':
        return `${column} LIKE '%${value}%'`;
      default:
        return `${column} = ${typeof value === 'string' ? `'${value}'` : value}`;
    }
  });

  return conditions.join(' AND ');
}

/**
 * Get the size of a directory in bytes
 */
function getDirectorySize(dirPath: string): number {
  let size = 0;
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      size += getDirectorySize(filePath);
    } else {
      size += stats.size;
    }
  }

  return size;
}

/**
 * Test database connection
 */
export async function testConnection(dbPath: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!fs.existsSync(dbPath)) {
      return { success: false, message: `Path does not exist: ${dbPath}` };
    }

    const stats = fs.statSync(dbPath);
    if (!stats.isDirectory()) {
      return { success: false, message: `Path is not a directory: ${dbPath}` };
    }

    // Try to connect
    const conn = await lancedb.connect(dbPath);
    const tableNames = await conn.tableNames();

    return {
      success: true,
      message: `Connected successfully. Found ${tableNames.length} tables.`,
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

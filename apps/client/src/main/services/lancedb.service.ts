/**
 * LanceDB Service for Electron Main Process
 * Provides native LanceDB database operations via Node.js SDK
 * Uses TypeDI for dependency injection and lancedb-core for shared functionality
 */

import { Service, Inject } from 'typedi';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  ConnectionManager,
  TableManager,
  QueryEngine,
  SchemaManager,
  buildWhereClause,
} from '@mancedb/lancedb-core';
import type {
  TableInfo,
  DatabaseInfo,
  TableSchema,
  TableDataResult,
  FilterCondition,
  DeleteTableResult,
  RenameTableResult,
  DeleteRowsResult,
} from '@mancedb/dto';
import type { TableDataQueryOptions } from '@mancedb/dto';
import type { S3Config } from './credential.service';

/**
 * Result of executing a SQL query
 */
export interface ExecuteQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

/**
 * Active connection state
 */
interface ConnectionState {
  uri: string;
  type: 'local' | 's3';
}

/**
 * LanceDBService provides database operations for the Electron client.
 * It wraps the shared lancedb-core services to provide a unified API.
 */
@Service()
export class LanceDBService {
  private activeConnection: ConnectionState | null = null;

  constructor(
    @Inject(() => ConnectionManager) private connectionManager: ConnectionManager,
    @Inject(() => TableManager) private tableManager: TableManager,
    @Inject(() => QueryEngine) private queryEngine: QueryEngine,
    @Inject(() => SchemaManager) private schemaManager: SchemaManager
  ) {}

  /**
   * Connect to a LanceDB database
   */
  async connectToDatabase(dbPath: string): Promise<void> {
    // Validate path exists for local connections
    if (!dbPath.startsWith('s3://')) {
      if (!fs.existsSync(dbPath)) {
        throw new Error(`Database path does not exist: ${dbPath}`);
      }

      const stats = fs.statSync(dbPath);
      if (!stats.isDirectory()) {
        throw new Error(`Database path must be a directory: ${dbPath}`);
      }
    }

    // Connect via ConnectionManager
    await this.connectionManager.connect(dbPath);

    this.activeConnection = {
      uri: dbPath,
      type: dbPath.startsWith('s3://') ? 's3' : 'local',
    };
  }

  /**
   * Close the active connection
   */
  async closeConnection(): Promise<void> {
    if (this.activeConnection) {
      await this.connectionManager.disconnect(this.activeConnection.uri);
      this.activeConnection = null;
    }
  }

  /**
   * Get the active connection URI or throw error
   */
  private getActiveUri(): string {
    if (!this.activeConnection) {
      throw new Error('No active database connection. Please connect to a database first.');
    }
    return this.activeConnection.uri;
  }

  /**
   * Get database information
   */
  async getDatabaseInfo(dbPath?: string): Promise<DatabaseInfo> {
    const uri = dbPath || this.getActiveUri();
    const connection = await this.connectionManager.connect(uri);
    const databasePath = dbPath || this.activeConnection!.uri;

    try {
      const tableNames = await connection.tableNames();
      const tables: TableInfo[] = [];

      for (const name of tableNames) {
        try {
          const table = await connection.openTable(name);
          const schema = await this.schemaManager.getTableSchema(table, name);

          tables.push({
            name,
            rowCount: schema.rowCount,
            sizeBytes: schema.sizeBytes,
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
        type: databasePath.startsWith('s3://') ? 's3' : 'local',
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
  async getTables(dbPath?: string): Promise<{ tables: TableInfo[]; totalCount: number }> {
    const uri = dbPath || this.getActiveUri();
    const tables = await this.tableManager.getTables(uri);
    return {
      tables,
      totalCount: tables.length,
    };
  }

  /**
   * Get table schema
   */
  async getTableSchema(tableName: string, dbPath?: string): Promise<TableSchema> {
    const uri = dbPath || this.getActiveUri();
    const table = await this.tableManager.getTable(uri, tableName);
    return this.schemaManager.getTableSchema(table, tableName);
  }

  /**
   * Get table data with pagination
   */
  async getTableData(
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
    const uri = dbPath || this.getActiveUri();

    const queryOptions: TableDataQueryOptions = {
      page: options.page || 1,
      pageSize: options.pageSize || 50,
      sortColumn: options.sortColumn,
      sortOrder: options.sortOrder,
      filters: options.filters,
    };

    return this.queryEngine.queryTable({
      uri,
      tableName,
      options: queryOptions,
    });
  }

  /**
   * Delete a table
   */
  async deleteTable(tableName: string, dbPath?: string): Promise<DeleteTableResult> {
    const uri = dbPath || this.getActiveUri();
    return this.tableManager.deleteTable(uri, tableName);
  }

  /**
   * Rename a table
   */
  async renameTable(
    tableName: string,
    newName: string,
    dbPath?: string
  ): Promise<RenameTableResult> {
    const uri = dbPath || this.getActiveUri();
    return this.tableManager.renameTable(uri, tableName, newName);
  }

  /**
   * Execute a SQL query (limited support for basic queries)
   */
  async executeQuery(
    sql: string,
    _limit?: number,
    dbPath?: string
  ): Promise<ExecuteQueryResult> {
    const uri = dbPath || this.getActiveUri();
    const startTime = Date.now();

    try {
      const result = await this.queryEngine.executeSql(uri, sql);

      return {
        rows: result.rows,
        rowCount: result.totalCount,
        executionTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      throw new Error(`Query execution failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Delete rows from a table
   */
  async deleteRows(
    tableName: string,
    options: {
      filters?: FilterCondition[];
      whereClause?: string;
    },
    dbPath?: string
  ): Promise<DeleteRowsResult> {
    const uri = dbPath || this.getActiveUri();
    const table = await this.tableManager.getTable(uri, tableName);

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
  }

  /**
   * Delete a single row by ID
   */
  async deleteRowById(
    tableName: string,
    rowId: string | number,
    dbPath?: string
  ): Promise<DeleteRowsResult> {
    // Try to delete by common ID column names
    const idColumns = ['id', '_id', 'row_id', 'pk'];

    for (const idCol of idColumns) {
      try {
        const result = await this.deleteRows(
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
   */
  async addColumn(
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
  async dropColumn(
    tableName: string,
    columnName: string,
    dbPath?: string
  ): Promise<{ name: string; version: number }> {
    // LanceDB doesn't support dropping columns from existing tables
    void tableName; void columnName; void dbPath;
    throw new Error('Dropping columns from existing tables is not supported in LanceDB. Create a new table with the desired schema instead.');
  }

  /**
   * Test database connection
   */
  async testConnection(dbPath: string): Promise<{ success: boolean; message: string }> {
    try {
      // For local paths, validate directory exists
      if (!dbPath.startsWith('s3://')) {
        if (!fs.existsSync(dbPath)) {
          return { success: false, message: `Path does not exist: ${dbPath}` };
        }

        const stats = fs.statSync(dbPath);
        if (!stats.isDirectory()) {
          return { success: false, message: `Path is not a directory: ${dbPath}` };
        }
      }

      // Try to connect
      const connection = await this.connectionManager.connect(dbPath);
      const tableNames = await connection.tableNames();

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

  /**
   * Connect to an S3 database
   */
  async connectToS3Database(config: S3Config): Promise<void> {
    const { bucket, region, awsAccessKeyId, awsSecretAccessKey, endpoint, prefix } = config;

    // Build S3 URI
    let s3Uri = `s3://${bucket}`;
    if (prefix) {
      s3Uri = `${s3Uri}/${prefix.replace(/^\//, '').replace(/\/$/, '')}`;
    }

    // Connect via ConnectionManager with S3 options
    await this.connectionManager.connect(s3Uri, {
      storageType: 's3',
      s3Config: {
        bucket,
        region,
        awsAccessKeyId,
        awsSecretAccessKey,
        endpoint: endpoint || undefined,
      },
    });

    this.activeConnection = {
      uri: s3Uri,
      type: 's3',
    };
  }

  /**
   * Test S3 database connection
   */
  async testS3Connection(config: S3Config): Promise<{ success: boolean; message: string }> {
    try {
      const { bucket, region, awsAccessKeyId, awsSecretAccessKey, endpoint, prefix } = config;

      // Build S3 URI
      let s3Uri = `s3://${bucket}`;
      if (prefix) {
        s3Uri = `${s3Uri}/${prefix.replace(/^\//, '').replace(/\/$/, '')}`;
      }

      // Try to connect with S3 options
      const connection = await this.connectionManager.connect(s3Uri, {
        storageType: 's3',
        s3Config: {
          bucket,
          region,
          awsAccessKeyId,
          awsSecretAccessKey,
          endpoint: endpoint || undefined,
        },
      });

      const tableNames = await connection.tableNames();

      return {
        success: true,
        message: `Connected successfully to S3. Found ${tableNames.length} tables.`,
      };
    } catch (error) {
      return {
        success: false,
        message: `S3 connection failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

// Export types for backward compatibility
export type { TableInfo, DatabaseInfo, TableSchema, TableDataResult, FilterCondition };

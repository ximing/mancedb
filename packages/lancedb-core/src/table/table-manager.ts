/**
 * Table Manager
 * Provides CRUD operations for LanceDB tables
 */

import { Service, Inject } from 'typedi';
import type { Connection, Table } from '@lancedb/lancedb';
import type { TableInfo, RenameTableResult, DeleteTableResult } from '@mancedb/dto';
import { ConnectionManager } from '../connection/connection-manager.js';
import { SchemaManager } from '../schema/schema-manager.js';

/**
 * Options for creating a new table
 */
export interface CreateTableOptions {
  /** Whether to overwrite existing table with the same name */
  overwrite?: boolean;
  /** Whether to ignore if table already exists */
  ignoreIfExists?: boolean;
}

/**
 * TableManager provides methods to manage LanceDB tables including
 * listing, creating, deleting, and renaming tables.
 *
 * @example
 * ```typescript
 * const tableManager = Container.get(TableManager);
 * const tables = await tableManager.getTables('s3://bucket/db');
 * await tableManager.createTable('s3://bucket/db', 'new_table', data);
 * ```
 */
@Service()
export class TableManager {
  constructor(
    @Inject(() => ConnectionManager) private connectionManager: ConnectionManager,
    @Inject(() => SchemaManager) private schemaManager: SchemaManager
  ) {}

  /**
   * Get all tables in a database
   *
   * @param uri - Database URI (local path or S3 URI)
   * @returns Array of TableInfo objects with metadata
   *
   * @example
   * ```typescript
   * const tables = await tableManager.getTables('/data/lancedb');
   * console.log(`Found ${tables.length} tables`);
   * tables.forEach(t => console.log(`${t.name}: ${t.rowCount} rows`));
   * ```
   */
  async getTables(uri: string): Promise<TableInfo[]> {
    const connection = await this.connectionManager.connect(uri);
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
      } catch (error) {
        console.warn(`Failed to get info for table ${name}:`, error);
        // Include table with unknown stats if we can't read it
        tables.push({
          name,
          rowCount: 0,
          sizeBytes: 0,
        });
      }
    }

    return tables;
  }

  /**
   * Get total count of tables in a database
   *
   * @param uri - Database URI
   * @returns Number of tables
   *
   * @example
   * ```typescript
   * const count = await tableManager.getTableCount('s3://bucket/db');
   * console.log(`Database has ${count} tables`);
   * ```
   */
  async getTableCount(uri: string): Promise<number> {
    const connection = await this.connectionManager.connect(uri);
    const tableNames = await connection.tableNames();
    return tableNames.length;
  }

  /**
   * Check if a table exists
   *
   * @param uri - Database URI
   * @param tableName - Name of the table to check
   * @returns True if table exists
   *
   * @example
   * ```typescript
   * const exists = await tableManager.tableExists('/data/lancedb', 'users');
   * if (exists) {
   *   console.log('Table exists');
   * }
   * ```
   */
  async tableExists(uri: string, tableName: string): Promise<boolean> {
    const connection = await this.connectionManager.connect(uri);
    const tableNames = await connection.tableNames();
    return tableNames.includes(tableName);
  }

  /**
   * Get a Table object for performing operations
   *
   * @param uri - Database URI
   * @param tableName - Name of the table to open
   * @returns LanceDB Table instance
   *
   * @example
   * ```typescript
   * const table = await tableManager.getTable('s3://bucket/db', 'users');
   * const count = await table.countRows();
   * ```
   */
  async getTable(uri: string, tableName: string): Promise<Table> {
    const connection = await this.connectionManager.connect(uri);
    return connection.openTable(tableName);
  }

  /**
   * Create a new table with data
   *
   * @param uri - Database URI
   * @param tableName - Name for the new table
   * @param data - Array of records or Arrow RecordBatch to populate the table
   * @param options - Creation options
   * @returns The created Table instance
   *
   * @example
   * ```typescript
   * const data = [
   *   { id: 1, name: 'Alice', embedding: [0.1, 0.2, 0.3] },
   *   { id: 2, name: 'Bob', embedding: [0.4, 0.5, 0.6] }
   * ];
   * const table = await tableManager.createTable('/data/lancedb', 'users', data);
   * ```
   */
  async createTable(
    uri: string,
    tableName: string,
    data: Record<string, unknown>[],
    options: CreateTableOptions = {}
  ): Promise<Table> {
    const connection = await this.connectionManager.connect(uri);

    // Check if table exists
    const exists = await this.tableExists(uri, tableName);

    if (exists) {
      if (options.ignoreIfExists) {
        return connection.openTable(tableName);
      }
      if (!options.overwrite) {
        throw new Error(`Table '${tableName}' already exists. Use overwrite: true to replace or ignoreIfExists: true to use existing.`);
      }
      // Drop existing table if overwrite is true
      await connection.dropTable(tableName);
    }

    return connection.createTable(tableName, data);
  }

  /**
   * Create an empty table with a specified schema
   * Note: LanceDB requires data to create a table, so this creates a table
   * with a single dummy row that can be deleted if needed.
   *
   * @param uri - Database URI
   * @param tableName - Name for the new table
   * @param columns - Column definitions
   * @param options - Creation options
   * @returns The created Table instance
   *
   * @example
   * ```typescript
   * const columns = [
   *   { name: 'id', type: 'int64', nullable: false },
   *   { name: 'name', type: 'string', nullable: true }
   * ];
   * const table = await tableManager.createEmptyTable('/data/lancedb', 'users', columns);
   * ```
   */
  async createEmptyTable(
    uri: string,
    tableName: string,
    columns: Array<{ name: string; type: string; nullable?: boolean }>,
    options: CreateTableOptions = {}
  ): Promise<Table> {
    // Build a sample record based on column definitions
    const sampleRecord: Record<string, unknown> = {};

    for (const col of columns) {
      switch (col.type) {
        case 'int64':
        case 'int32':
        case 'int':
          sampleRecord[col.name] = 0;
          break;
        case 'float64':
        case 'float32':
        case 'float':
          sampleRecord[col.name] = 0.0;
          break;
        case 'string':
        case 'utf8':
          sampleRecord[col.name] = '';
          break;
        case 'binary':
          sampleRecord[col.name] = new Uint8Array(0);
          break;
        case 'bool':
        case 'boolean':
          sampleRecord[col.name] = false;
          break;
        default:
          sampleRecord[col.name] = null;
      }
    }

    return this.createTable(uri, tableName, [sampleRecord], options);
  }

  /**
   * Delete a table from the database
   *
   * @param uri - Database URI
   * @param tableName - Name of the table to delete
   * @returns DeleteTableResult with deletion status
   *
   * @example
   * ```typescript
   * const result = await tableManager.deleteTable('s3://bucket/db', 'old_table');
   * if (result.deleted) {
   *   console.log(`Table ${result.name} was deleted`);
   * }
   * ```
   */
  async deleteTable(uri: string, tableName: string): Promise<DeleteTableResult> {
    const connection = await this.connectionManager.connect(uri);

    // Check if table exists
    const exists = await this.tableExists(uri, tableName);
    if (!exists) {
      return {
        name: tableName,
        deleted: false,
      };
    }

    await connection.dropTable(tableName);

    return {
      name: tableName,
      deleted: true,
    };
  }

  /**
   * Rename a table
   * Note: LanceDB doesn't support native rename, so this copies data
   * to a new table and deletes the old one.
   *
   * @param uri - Database URI
   * @param oldName - Current table name
   * @param newName - New table name
   * @returns RenameTableResult with old and new names
   *
   * @example
   * ```typescript
   * const result = await tableManager.renameTable('/data/lancedb', 'users', 'customers');
   * console.log(`Renamed ${result.oldName} to ${result.newName}`);
   * ```
   */
  async renameTable(uri: string, oldName: string, newName: string): Promise<RenameTableResult> {
    const connection = await this.connectionManager.connect(uri);

    // Validate source table exists
    const sourceExists = await this.tableExists(uri, oldName);
    if (!sourceExists) {
      throw new Error(`Table '${oldName}' not found`);
    }

    // Check target doesn't exist
    const targetExists = await this.tableExists(uri, newName);
    if (targetExists) {
      throw new Error(`Table '${newName}' already exists`);
    }

    // Open source table and copy all data
    const sourceTable = await connection.openTable(oldName);

    // Get all data from source table
    // Use a large limit to get all rows - LanceDB doesn't have a direct "get all" method
    const allData = await sourceTable.query().limit(1000000).toArray();

    // Create new table with same data
    await connection.createTable(newName, allData);

    // Drop old table
    await connection.dropTable(oldName);

    return {
      oldName,
      newName,
    };
  }

  /**
   * Copy a table to a new name
   *
   * @param uri - Database URI
   * @param sourceName - Source table name
   * @param targetName - Target table name
   * @param options - Options including overwrite flag
   * @returns The created Table instance
   *
   * @example
   * ```typescript
   * const copy = await tableManager.copyTable('/data/lancedb', 'users', 'users_backup');
   * ```
   */
  async copyTable(
    uri: string,
    sourceName: string,
    targetName: string,
    options: { overwrite?: boolean } = {}
  ): Promise<Table> {
    const connection = await this.connectionManager.connect(uri);

    // Validate source table exists
    const sourceExists = await this.tableExists(uri, sourceName);
    if (!sourceExists) {
      throw new Error(`Source table '${sourceName}' not found`);
    }

    // Check target
    const targetExists = await this.tableExists(uri, targetName);
    if (targetExists) {
      if (!options.overwrite) {
        throw new Error(`Target table '${targetName}' already exists. Use overwrite: true to replace.`);
      }
      await connection.dropTable(targetName);
    }

    // Open source table and copy all data
    const sourceTable = await connection.openTable(sourceName);
    const allData = await sourceTable.query().limit(1000000).toArray();

    // Create new table with same data
    return connection.createTable(targetName, allData);
  }

  /**
   * Get table statistics including row count and size
   *
   * @param uri - Database URI
   * @param tableName - Name of the table
   * @returns TableInfo with statistics
   *
   * @example
   * ```typescript
   * const stats = await tableManager.getTableStats('s3://bucket/db', 'users');
   * console.log(`${stats.name}: ${stats.rowCount} rows, ${stats.sizeBytes} bytes`);
   * ```
   */
  async getTableStats(uri: string, tableName: string): Promise<TableInfo> {
    const table = await this.getTable(uri, tableName);
    const schema = await this.schemaManager.getTableSchema(table, tableName);

    return {
      name: tableName,
      rowCount: schema.rowCount,
      sizeBytes: schema.sizeBytes,
    };
  }

  /**
   * Clear all data from a table (delete all rows)
   * Note: This creates an empty table with the same schema
   *
   * @param uri - Database URI
   * @param tableName - Name of the table to clear
   * @returns True if table was cleared
   *
   * @example
   * ```typescript
   * await tableManager.clearTable('/data/lancedb', 'users');
   * console.log('Table cleared');
   * ```
   */
  async clearTable(uri: string, tableName: string): Promise<boolean> {
    const connection = await this.connectionManager.connect(uri);

    // Validate table exists
    const exists = await this.tableExists(uri, tableName);
    if (!exists) {
      throw new Error(`Table '${tableName}' not found`);
    }

    // Get schema before dropping
    const table = await connection.openTable(tableName);
    const schema = await this.schemaManager.getTableSchema(table, tableName);

    // Drop the table
    await connection.dropTable(tableName);

    // Recreate with empty data using schema info
    const sampleRecord: Record<string, unknown> = {};
    for (const col of schema.columns) {
      switch (col.type) {
        case 'int64':
          sampleRecord[col.name] = 0;
          break;
        case 'float64':
          sampleRecord[col.name] = 0.0;
          break;
        case 'string':
          sampleRecord[col.name] = '';
          break;
        case 'binary':
          sampleRecord[col.name] = new Uint8Array(0);
          break;
        case 'bool':
          sampleRecord[col.name] = false;
          break;
        default:
          if (col.vectorDimension) {
            // Vector column - create zero vector
            sampleRecord[col.name] = new Array(col.vectorDimension).fill(0);
          } else {
            sampleRecord[col.name] = null;
          }
      }
    }

    // Create table with one row, then delete it to make it truly empty
    const newTable = await connection.createTable(tableName, [sampleRecord]);

    // Delete the sample row if there's an id column
    const idColumns = ['id', '_id', 'row_id'];
    for (const idCol of idColumns) {
      if (sampleRecord[idCol] !== undefined) {
        try {
          await newTable.delete(`${idCol} = ${sampleRecord[idCol]}`);
          break;
        } catch {
          // Ignore delete errors
        }
      }
    }

    return true;
  }
}

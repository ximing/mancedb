import { Service, Inject } from 'typedi';
import type { Connection } from '@lancedb/lancedb';
import {
  ConnectionManager,
  TableManager,
  SchemaManager,
  QueryEngine,
} from '@mancedb/lancedb-core';
import type {
  ColumnInfo,
  TableSchema,
  FilterCondition,
  TableDataQueryOptions,
  TableDataResult,
} from '@mancedb/dto';
import { ConnectionService } from './connection.service.js';

export interface AddColumnOptions {
  name: string;
  type: 'int64' | 'float64' | 'string' | 'binary' | 'vector';
  vectorDimension?: number;
  nullable?: boolean;
}

export interface AddColumnResult {
  version: number;
}

export interface DropColumnResult {
  version: number;
}

export interface RenameTableResult {
  oldName: string;
  newName: string;
}

export interface DeleteTableResult {
  name: string;
  deleted: boolean;
}

export interface DeleteRowsResult {
  deletedCount: number;
}

// Re-export types from DTO for backward compatibility
export type { ColumnInfo, TableSchema, FilterCondition, TableDataQueryOptions, TableDataResult };

@Service()
export class TableService {
  constructor(
    private connectionService: ConnectionService,
    @Inject(() => ConnectionManager) private connectionManager: ConnectionManager,
    @Inject(() => TableManager) private tableManager: TableManager,
    @Inject(() => SchemaManager) private schemaManager: SchemaManager,
    @Inject(() => QueryEngine) private queryEngine: QueryEngine
  ) {}

  /**
   * Connect to a LanceDB database using connection configuration
   */
  private async connectToDatabase(connectionId: string): Promise<Connection> {
    const connection = await this.connectionService.getConnectionWithSecrets(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.type === 'local') {
      if (!connection.localPath) {
        throw new Error('Local path is not configured');
      }
      return await this.connectionManager.connect(connection.localPath);
    } else if (connection.type === 's3') {
      if (!connection.s3Bucket || !connection.s3Region) {
        throw new Error('S3 configuration is incomplete');
      }

      // Decrypt credentials
      const accessKey = connection.s3AccessKey
        ? await this.decryptIfNeeded(connection.s3AccessKey)
        : undefined;
      const secretKey = connection.s3SecretKey
        ? await this.decryptIfNeeded(connection.s3SecretKey)
        : undefined;

      if (!accessKey || !secretKey) {
        throw new Error('S3 credentials are not configured');
      }

      const path = `s3://${connection.s3Bucket}/lancedb`;
      return await this.connectionManager.connect(path, {
        storageType: 's3',
        s3Config: {
          bucket: connection.s3Bucket,
          region: connection.s3Region,
          awsAccessKeyId: accessKey,
          awsSecretAccessKey: secretKey,
          endpoint: connection.s3Endpoint || undefined,
        },
      });
    }

    throw new Error('Unknown connection type');
  }

  /**
   * Helper to get connection URI from connection ID
   */
  private async getConnectionUri(connectionId: string): Promise<string> {
    const connection = await this.connectionService.getConnectionWithSecrets(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.type === 'local') {
      if (!connection.localPath) {
        throw new Error('Local path is not configured');
      }
      return connection.localPath;
    } else {
      if (!connection.s3Bucket) {
        throw new Error('S3 bucket is not configured');
      }
      return `s3://${connection.s3Bucket}/lancedb`;
    }
  }

  /**
   * Get table schema information
   */
  async getTableSchema(connectionId: string, tableName: string): Promise<TableSchema | null> {
    const db = await this.connectToDatabase(connectionId);
    try {
      // Check if table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(tableName)) {
        return null;
      }

      const table = await db.openTable(tableName);
      try {
        // Use SchemaManager to get table schema
        return await this.schemaManager.getTableSchema(table, tableName);
      } finally {
        table.close();
      }
    } finally {
      db.close();
    }
  }

  /**
   * Get table data with pagination, sorting, and filtering
   * Uses QueryEngine from lancedb-core for query execution
   */
  async getTableData(
    connectionId: string,
    tableName: string,
    options: TableDataQueryOptions
  ): Promise<TableDataResult | null> {
    const uri = await this.getConnectionUri(connectionId);

    // Check if table exists
    const tableExists = await this.tableManager.tableExists(uri, tableName);
    if (!tableExists) {
      return null;
    }

    // Use QueryEngine to query the table
    return await this.queryEngine.queryTable({
      uri,
      tableName,
      options,
    });
  }

  /**
   * Helper to decrypt encrypted values (if they appear encrypted)
   */
  private async decryptIfNeeded(value: string): Promise<string> {
    // The value is already decrypted by the connection service when needed
    // This is a placeholder for any additional decryption logic
    return value;
  }

  /**
   * Add a new column to the table
   * LanceDB only supports adding nullable columns
   */
  async addColumn(
    connectionId: string,
    tableName: string,
    options: AddColumnOptions
  ): Promise<AddColumnResult> {
    const db = await this.connectToDatabase(connectionId);
    try {
      // Check if table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(tableName)) {
        throw new Error(`Table '${tableName}' not found`);
      }

      const table = await db.openTable(tableName);
      try {
        // Check if column already exists
        const schema = await table.schema();
        const existingColumn = schema.fields.find((f) => f.name === options.name);
        if (existingColumn) {
          throw new Error(`Column '${options.name}' already exists`);
        }

        // Build the SQL expression for the default value based on type
        const defaultValueSql = this.buildDefaultValueSql(options);

        // Add the column using LanceDB's addColumns method
        const result = await table.addColumns([
          {
            name: options.name,
            valueSql: defaultValueSql,
          },
        ]);

        return {
          version: result.version,
        };
      } finally {
        table.close();
      }
    } finally {
      db.close();
    }
  }

  /**
   * Build SQL expression for default value based on column type
   */
  private buildDefaultValueSql(options: AddColumnOptions): string {
    const { type, vectorDimension } = options;

    switch (type) {
      case 'int64':
        return 'CAST(NULL AS BIGINT)';
      case 'float64':
        return 'CAST(NULL AS DOUBLE)';
      case 'string':
        return 'CAST(NULL AS VARCHAR)';
      case 'binary':
        return 'CAST(NULL AS VARBINARY)';
      case 'vector':
        if (!vectorDimension || vectorDimension <= 0) {
          throw new Error('Vector dimension is required and must be positive');
        }
        // For vector types, we create a fixed-size list of floats filled with NULL
        // LanceDB uses arrow_cast for complex types
        return `arrow_cast(NULL, 'FixedSizeList<${vectorDimension}, Float32>')`;
      default:
        return 'CAST(NULL AS VARCHAR)';
    }
  }

  /**
   * Drop a column from the table
   */
  async dropColumn(
    connectionId: string,
    tableName: string,
    columnName: string
  ): Promise<DropColumnResult> {
    const db = await this.connectToDatabase(connectionId);
    try {
      // Check if table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(tableName)) {
        throw new Error(`Table '${tableName}' not found`);
      }

      const table = await db.openTable(tableName);
      try {
        // Check if column exists
        const schema = await table.schema();
        const existingColumn = schema.fields.find((f) => f.name === columnName);
        if (!existingColumn) {
          throw new Error(`Column '${columnName}' does not exist`);
        }

        // Drop the column using LanceDB's dropColumns method
        const result = await table.dropColumns([columnName]);

        return {
          version: result.version,
        };
      } finally {
        table.close();
      }
    } finally {
      db.close();
    }
  }

  /**
   * Delete a table from the database
   */
  async deleteTable(connectionId: string, tableName: string): Promise<DeleteTableResult> {
    const db = await this.connectToDatabase(connectionId);
    try {
      // Check if table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(tableName)) {
        throw new Error(`Table '${tableName}' not found`);
      }

      // Delete the table using LanceDB's dropTable method
      await db.dropTable(tableName);

      return {
        name: tableName,
        deleted: true,
      };
    } finally {
      db.close();
    }
  }

  /**
   * Rename a table
   * LanceDB doesn't have a native rename method, so we create a new table,
   * copy the data, and drop the old one.
   */
  async renameTable(connectionId: string, oldName: string, newName: string): Promise<RenameTableResult> {
    const db = await this.connectToDatabase(connectionId);
    try {
      // Check if old table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(oldName)) {
        throw new Error(`Table '${oldName}' not found`);
      }

      // Check if new name already exists
      if (tableNames.includes(newName)) {
        throw new Error(`Table '${newName}' already exists`);
      }

      // Validate new table name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
        throw new Error(
          'Table name must start with letter or underscore and contain only letters, numbers, and underscores'
        );
      }

      // Open the old table
      const oldTable = await db.openTable(oldName);
      try {
        // Get the schema
        const schema = await oldTable.schema();

        // Get all data from the old table
        const allData = await oldTable.query().toArray();

        // Create new table with the same schema and data
        await db.createTable({
          name: newName,
          schema,
          data: allData,
          mode: 'create',
          existOk: false,
        });

        // Drop the old table
        await db.dropTable(oldName);

        return {
          oldName,
          newName,
        };
      } finally {
        oldTable.close();
      }
    } finally {
      db.close();
    }
  }

  /**
   * Delete rows from a table based on filter conditions
   * LanceDB uses the delete() method with a WHERE clause
   */
  async deleteRows(
    connectionId: string,
    tableName: string,
    filters?: FilterCondition[],
    whereClause?: string
  ): Promise<DeleteRowsResult> {
    const db = await this.connectToDatabase(connectionId);
    try {
      // Check if table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(tableName)) {
        throw new Error(`Table '${tableName}' not found`);
      }

      const table = await db.openTable(tableName);
      try {
        // Build the WHERE clause for deletion
        let deleteFilter: string | undefined;

        if (whereClause) {
          // Use provided raw WHERE clause
          deleteFilter = whereClause;
        } else if (filters && filters.length > 0) {
          // Build filter string from conditions
          deleteFilter = this.buildFilterString(filters);
        }

        if (!deleteFilter) {
          throw new Error('Delete condition is required. Provide either filters or whereClause.');
        }

        // Get count before deletion for reporting
        const countBefore = await table.countRows();

        // Execute the delete operation
        await table.delete(deleteFilter);

        // Get count after deletion
        const countAfter = await table.countRows();
        const deletedCount = countBefore - countAfter;

        return {
          deletedCount,
        };
      } finally {
        table.close();
      }
    } finally {
      db.close();
    }
  }

  /**
   * Build LanceDB filter string from filter conditions
   * Note: This is kept for deleteRows which still uses it directly.
   * For queries, QueryEngine uses filter-builder from lancedb-core.
   */
  private buildFilterString(filters?: FilterCondition[]): string | undefined {
    if (!filters || filters.length === 0) {
      return undefined;
    }

    const conditions: string[] = [];

    for (const filter of filters) {
      const condition = this.buildSingleFilter(filter);
      if (condition) {
        conditions.push(condition);
      }
    }

    if (conditions.length === 0) {
      return undefined;
    }

    // Join conditions with AND
    return conditions.join(' AND ');
  }

  /**
   * Build a single filter condition string
   */
  private buildSingleFilter(filter: FilterCondition): string | undefined {
    const { column, operator, value } = filter;

    // Escape single quotes in column name and string values
    const escapedColumn = column.replace(/'/g, "\\'");

    switch (operator) {
      case 'contains':
        // For text contains, use SQL LIKE with wildcards
        if (typeof value === 'string') {
          const escapedValue = value.replace(/'/g, "\\'").replace(/%/g, '\\%');
          return `${escapedColumn} LIKE '%${escapedValue}%'}`;
        }
        return undefined;

      case 'eq':
        if (typeof value === 'string') {
          const escapedValue = value.replace(/'/g, "\\'");
          return `${escapedColumn} = '${escapedValue}'`;
        }
        return `${escapedColumn} = ${value}`;

      case 'gt':
        if (typeof value === 'string') {
          const escapedValue = value.replace(/'/g, "\\'");
          return `${escapedColumn} > '${escapedValue}'`;
        }
        return `${escapedColumn} > ${value}`;

      case 'gte':
        if (typeof value === 'string') {
          const escapedValue = value.replace(/'/g, "\\'");
          return `${escapedColumn} >= '${escapedValue}'`;
        }
        return `${escapedColumn} >= ${value}`;

      case 'lt':
        if (typeof value === 'string') {
          const escapedValue = value.replace(/'/g, "\\'");
          return `${escapedColumn} < '${escapedValue}'`;
        }
        return `${escapedColumn} < ${value}`;

      case 'lte':
        if (typeof value === 'string') {
          const escapedValue = value.replace(/'/g, "\\'");
          return `${escapedColumn} <= '${escapedValue}'`;
        }
        return `${escapedColumn} <= ${value}`;

      default:
        return undefined;
    }
  }

  /**
   * Delete a single row by ID
   * Assumes the table has an 'id' column
   */
  async deleteRowById(
    connectionId: string,
    tableName: string,
    id: string | number
  ): Promise<DeleteRowsResult> {
    const db = await this.connectToDatabase(connectionId);
    try {
      // Check if table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(tableName)) {
        throw new Error(`Table '${tableName}' not found`);
      }

      const table = await db.openTable(tableName);
      try {
        // Build the WHERE clause for the ID
        let idFilter: string;
        if (typeof id === 'string') {
          const escapedId = id.replace(/'/g, "\\'");
          idFilter = `id = '${escapedId}'`;
        } else {
          idFilter = `id = ${id}`;
        }

        // Get count before deletion
        const countBefore = await table.countRows();

        // Execute the delete operation
        await table.delete(idFilter);

        // Get count after deletion
        const countAfter = await table.countRows();
        const deletedCount = countBefore - countAfter;

        return {
          deletedCount,
        };
      } finally {
        table.close();
      }
    } finally {
      db.close();
    }
  }
}

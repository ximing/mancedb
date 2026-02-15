import { Service } from 'typedi';
import * as lancedb from '@lancedb/lancedb';
import type { Connection } from '@lancedb/lancedb';
import { ConnectionService } from './connection.service.js';

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
  createdAt?: number;
}

export interface FilterCondition {
  column: string;
  operator: 'contains' | 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
  value: string | number;
}

export interface TableDataQueryOptions {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortOrder?: 'asc' | 'desc';
  filters?: FilterCondition[];
}

export interface TableDataResult {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

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

@Service()
export class TableService {
  constructor(private connectionService: ConnectionService) {}

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
      return await lancedb.connect(connection.localPath);
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

      const storageOptions: Record<string, string> = {
        virtualHostedStyleRequest: 'true',
        conditionalPut: 'disabled',
        awsAccessKeyId: accessKey,
        awsSecretAccessKey: secretKey,
        awsRegion: connection.s3Region,
      };

      if (connection.s3Endpoint) {
        storageOptions.awsEndpoint = connection.s3Endpoint;
      }

      const path = `s3://${connection.s3Bucket}/lancedb`;
      return await lancedb.connect(path, { storageOptions });
    }

    throw new Error('Unknown connection type');
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
        // Get schema from the table (schema is a method that returns Promise<Schema>)
        const schema = await table.schema();
        const rowCount = await table.countRows();

        // Parse columns from schema
        const columns: ColumnInfo[] = [];
        for (const field of schema.fields) {
          const columnInfo = this.parseField(field);
          columns.push(columnInfo);
        }

        // Estimate size (LanceDB doesn't provide direct size API)
        const sizeBytes = this.estimateTableSize(rowCount, columns);

        return {
          name: tableName,
          columns,
          rowCount,
          sizeBytes,
        };
      } finally {
        table.close();
      }
    } finally {
      db.close();
    }
  }

  /**
   * Parse an Arrow field to ColumnInfo
   */
  private parseField(field: { name: string; type: { toString(): string }; nullable: boolean }): ColumnInfo {
    const typeStr = field.type.toString();
    const columnInfo: ColumnInfo = {
      name: field.name,
      type: this.mapArrowTypeToDisplayType(typeStr),
      nullable: field.nullable,
    };

    // Check if it's a fixed_size_list (vector) type
    const vectorMatch = typeStr.match(/fixed_size_list<([^,]+),\s*(\d+)>/);
    if (vectorMatch) {
      columnInfo.vectorDimension = parseInt(vectorMatch[2], 10);
      columnInfo.type = `vector(${vectorMatch[1]})`;
    }

    return columnInfo;
  }

  /**
   * Map Arrow type string to display type
   */
  private mapArrowTypeToDisplayType(arrowType: string): string {
    // Handle fixed_size_list for vectors
    if (arrowType.startsWith('fixed_size_list')) {
      const match = arrowType.match(/fixed_size_list<([^,]+),\s*(\d+)>/);
      if (match) {
        return `vector(${match[1]}, ${match[2]}d)`;
      }
      return 'vector';
    }

    // Handle list types
    if (arrowType.startsWith('list')) {
      const match = arrowType.match(/list<(.+)>/);
      if (match) {
        return `list<${this.mapArrowTypeToDisplayType(match[1])}>`;
      }
      return 'list';
    }

    // Handle dictionary type
    if (arrowType.startsWith('dictionary')) {
      return 'string';
    }

    // Handle timestamp types
    if (arrowType.startsWith('timestamp')) {
      return 'timestamp';
    }

    // Handle decimal types
    if (arrowType.startsWith('decimal')) {
      return 'decimal';
    }

    // Handle struct types
    if (arrowType.startsWith('struct')) {
      return 'struct';
    }

    // Handle map types
    if (arrowType.startsWith('map')) {
      return 'map';
    }

    // Handle union types
    if (arrowType.startsWith('union')) {
      return 'union';
    }

    // Basic types
    const typeMap: Record<string, string> = {
      'int8': 'int8',
      'int16': 'int16',
      'int32': 'int32',
      'int64': 'int64',
      'uint8': 'uint8',
      'uint16': 'uint16',
      'uint32': 'uint32',
      'uint64': 'uint64',
      'float': 'float32',
      'float16': 'float16',
      'float32': 'float32',
      'float64': 'float64',
      'double': 'float64',
      'bool': 'boolean',
      'utf8': 'string',
      'large_utf8': 'large_string',
      'binary': 'binary',
      'large_binary': 'large_binary',
      'date': 'date',
      'date32': 'date32',
      'date64': 'date64',
      'time': 'time',
      'time32': 'time32',
      'time64': 'time64',
      'interval': 'interval',
      'duration': 'duration',
      'null': 'null',
    };

    // Extract base type (remove parameters like (unit: Millisecond))
    const baseType = arrowType.split('(')[0].trim().toLowerCase();

    return typeMap[baseType] || arrowType;
  }

  /**
   * Estimate table size based on row count and column types
   */
  private estimateTableSize(rowCount: number, columns: ColumnInfo[]): number {
    let bytesPerRow = 0;

    for (const col of columns) {
      if (col.vectorDimension) {
        // Vector column: assume float32 (4 bytes) per dimension
        bytesPerRow += col.vectorDimension * 4;
      } else if (col.type === 'string' || col.type === 'utf8' || col.type === 'binary') {
        // Variable length: estimate average 50 bytes
        bytesPerRow += 50;
      } else if (col.type.startsWith('int') || col.type.startsWith('float') || col.type === 'number') {
        // Numeric types
        if (col.type.includes('64')) {
          bytesPerRow += 8;
        } else if (col.type.includes('32')) {
          bytesPerRow += 4;
        } else if (col.type.includes('16')) {
          bytesPerRow += 2;
        } else {
          bytesPerRow += 4;
        }
      } else if (col.type === 'boolean' || col.type === 'bool') {
        bytesPerRow += 1;
      } else if (col.type === 'timestamp' || col.type === 'date64') {
        bytesPerRow += 8;
      } else {
        // Default estimate
        bytesPerRow += 8;
      }
    }

    return rowCount * bytesPerRow;
  }

  /**
   * Get table data with pagination, sorting, and filtering
   */
  async getTableData(
    connectionId: string,
    tableName: string,
    options: TableDataQueryOptions
  ): Promise<TableDataResult | null> {
    const db = await this.connectToDatabase(connectionId);
    try {
      // Check if table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(tableName)) {
        return null;
      }

      const table = await db.openTable(tableName);
      try {
        // Build filter string from conditions
        const filterString = this.buildFilterString(options.filters);

        // Get total count (if filters applied, we need to count filtered results)
        let totalCount: number;
        if (filterString) {
          // For filtered queries, we need to execute a count query
          // LanceDB doesn't have a direct count() on Query, so we use toArray and count
          // For large datasets, this could be optimized
          const countQuery = table.query().where(filterString);
          const allFiltered = await countQuery.toArray();
          totalCount = allFiltered.length;
        } else {
          totalCount = await table.countRows();
        }

        // Build the data query
        let query = table.query();

        // Apply filters
        if (filterString) {
          query = query.where(filterString);
        }

        // Apply pagination
        const offset = (options.page - 1) * options.pageSize;
        query = query.limit(options.pageSize).offset(offset);

        // Execute query
        const results = await query.toArray();

        // Process results - truncate vectors for display
        const processedRows = results.map((row) => this.processRow(row));

        const totalPages = Math.ceil(totalCount / options.pageSize);

        return {
          rows: processedRows,
          totalCount,
          page: options.page,
          pageSize: options.pageSize,
          totalPages,
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
          return `${escapedColumn} LIKE '%${escapedValue}%'`;
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
   * Process a row to truncate vectors for display
   */
  private processRow(row: Record<string, unknown>): Record<string, unknown> {
    const processed: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(row)) {
      if (this.isVector(value)) {
        // Truncate vector to show dimension summary
        const vector = value as number[] | Float32Array | Float64Array;
        processed[key] = `[${vector.length}-dim vector]`;
      } else if (value instanceof Date) {
        processed[key] = value.toISOString();
      } else if (value instanceof Uint8Array || value instanceof Buffer) {
        // Truncate binary data
        processed[key] = `[${value.length} bytes]`;
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  /**
   * Check if a value is a vector (array of numbers or typed array)
   */
  private isVector(value: unknown): boolean {
    if (Array.isArray(value)) {
      // Check if it's an array of numbers (vector)
      return value.length > 0 && typeof value[0] === 'number' && value.length > 10;
    }
    if (value instanceof Float32Array || value instanceof Float64Array) {
      return value.length > 10;
    }
    return false;
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
}

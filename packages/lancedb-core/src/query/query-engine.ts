/**
 * Query Engine
 * Provides query execution capabilities for LanceDB tables including
 * filtered queries with pagination, sorting, and SQL execution.
 */

import { Service, Inject } from 'typedi';
import type { Table } from '@lancedb/lancedb';
import type { FilterCondition, TableDataResult, TableDataQueryOptions } from '@mancedb/dto';
import { ConnectionManager } from '../connection/connection-manager.js';
import { TableManager } from '../table/table-manager.js';
import { buildWhereClause } from '../utils/filter-builder.js';
import { processRows } from '../utils/row-processor.js';

/**
 * Parameters for querying a table
 */
export interface QueryTableParams {
  /** Database URI */
  uri: string;
  /** Table name */
  tableName: string;
  /** Query options including pagination, sorting, and filtering */
  options: TableDataQueryOptions;
}

/**
 * QueryEngine provides methods to execute queries against LanceDB tables.
 * It supports filtered queries with pagination, sorting, and SQL execution.
 *
 * @example
 * ```typescript
 * const queryEngine = Container.get(QueryEngine);
 *
 * // Query with filters and pagination
 * const result = await queryEngine.queryTable({
 *   uri: '/data/lancedb',
 *   tableName: 'users',
 *   options: {
 *     page: 1,
 *     pageSize: 50,
 *     sortColumn: 'name',
 *     sortOrder: 'asc',
 *     filters: [{ column: 'age', operator: 'gte', value: 18 }]
 *   }
 * });
 *
 * // Execute SQL
 * const sqlResult = await queryEngine.executeSql('/data/lancedb', 'SELECT * FROM users WHERE age > 18');
 * ```
 */
@Service()
export class QueryEngine {
  constructor(
    @Inject(() => ConnectionManager) private connectionManager: ConnectionManager,
    @Inject(() => TableManager) private tableManager: TableManager
  ) {}

  /**
   * Query a table with pagination, sorting, and filtering
   *
   * @param params - Query parameters including URI, table name, and options
   * @returns TableDataResult with rows and pagination metadata
   *
   * @example
   * ```typescript
   * const result = await queryEngine.queryTable({
   *   uri: 's3://bucket/db',
   *   tableName: 'products',
   *   options: {
   *     page: 1,
   *     pageSize: 100,
   *     sortColumn: 'price',
   *     sortOrder: 'desc',
   *     filters: [
   *       { column: 'category', operator: 'eq', value: 'electronics' },
   *       { column: 'price', operator: 'lt', value: 1000 }
   *     ]
   *   }
   * });
   * console.log(`Found ${result.totalCount} rows, showing page ${result.page} of ${result.totalPages}`);
   * ```
   */
  async queryTable(params: QueryTableParams): Promise<TableDataResult> {
    const { uri, tableName, options } = params;
    const { page, pageSize, sortColumn, sortOrder, filters } = options;

    // Get the table
    const table = await this.tableManager.getTable(uri, tableName);

    // Get total count (with filters applied)
    const totalCount = await this.getFilteredCount(table, filters);

    // Build and execute the query
    const rows = await this.executeQuery(table, {
      page,
      pageSize,
      sortColumn,
      sortOrder,
      filters,
    });

    // Process rows for display (truncate vectors, etc.)
    const processedRows = processRows(rows);

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      rows: processedRows,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  }

  /**
   * Execute a SQL SELECT query
   * Note: LanceDB has limited SQL support. This method uses query API
   * for simple SELECT * FROM table WHERE conditions.
   *
   * @param uri - Database URI
   * @param sql - SQL SELECT statement
   * @returns TableDataResult with query results
   *
   * @example
   * ```typescript
   * const result = await queryEngine.executeSql('/data/lancedb', 'SELECT * FROM users WHERE age > 18');
   * console.log(`Found ${result.totalCount} matching rows`);
   * ```
   */
  async executeSql(uri: string, sql: string): Promise<TableDataResult> {
    // Parse basic SQL to extract table name and WHERE clause
    const parsed = this.parseSql(sql);

    if (!parsed.tableName) {
      throw new Error('Unable to parse table name from SQL. Expected format: SELECT * FROM table_name [WHERE conditions]');
    }

    // Get the table
    const table = await this.tableManager.getTable(uri, parsed.tableName);

    // Convert SQL WHERE to FilterCondition array
    const filters = parsed.whereClause ? this.sqlWhereToFilters(parsed.whereClause) : undefined;

    // Execute query with filters
    const totalCount = await this.getFilteredCount(table, filters);

    // Get all rows (no pagination for SQL queries)
    const rows = await this.executeQuery(table, {
      page: 1,
      pageSize: totalCount || 1000000, // Get all rows
      filters,
    });

    // Process rows for display
    const processedRows = processRows(rows);

    return {
      rows: processedRows,
      totalCount,
      page: 1,
      pageSize: totalCount || processedRows.length,
      totalPages: 1,
    };
  }

  /**
   * Get the count of rows matching the filter conditions
   *
   * @param table - LanceDB Table instance
   * @param filters - Optional filter conditions
   * @returns Count of matching rows
   */
  private async getFilteredCount(table: Table, filters?: FilterCondition[]): Promise<number> {
    const whereClause = buildWhereClause(filters || []);

    if (whereClause) {
      // LanceDB doesn't have a direct count with filter method
      // We need to query and count the results
      // Use a large limit to get all matching rows
      const results = await table.query().where(whereClause).limit(1000000).toArray();
      return results.length;
    }

    // No filters, use countRows()
    return table.countRows();
  }

  /**
   * Execute a query with the given parameters
   *
   * @param table - LanceDB Table instance
   * @param options - Query options
   * @returns Array of row data
   */
  private async executeQuery(
    table: Table,
    options: {
      page: number;
      pageSize: number;
      sortColumn?: string;
      sortOrder?: 'asc' | 'desc';
      filters?: FilterCondition[];
    }
  ): Promise<Record<string, unknown>[]> {
    const { page, pageSize, sortColumn, sortOrder, filters } = options;

    // Build where clause from filters
    const whereClause = buildWhereClause(filters || []);

    // Start building the query
    let query = table.query();

    // Apply filter if present
    if (whereClause) {
      query = query.where(whereClause);
    }

    // Note: LanceDB doesn't support sorting via orderBy in the current SDK version
    // Sorting would need to be done client-side after fetching data
    // We log a warning if sorting is requested but not supported
    if (sortColumn) {
      console.warn(`Sorting by ${sortColumn} (${sortOrder}) is not supported by LanceDB query API. Results will be unsorted.`);
    }

    // Calculate offset for pagination
    const offset = (page - 1) * pageSize;

    // Apply offset and limit for pagination
    query = query.offset(offset).limit(pageSize);

    // Execute query
    const results = await query.toArray();

    // Convert to plain objects
    return results.map((record) => this.recordToObject(record));
  }

  /**
   * Convert a LanceDB record to a plain JavaScript object
   *
   * @param record - Record from LanceDB query
   * @returns Plain object with column values
   */
  private recordToObject(record: Record<string, unknown>): Record<string, unknown> {
    const obj: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(record)) {
      // Handle different value types
      if (value instanceof Float32Array || value instanceof Float64Array ||
          value instanceof Int32Array || value instanceof Int16Array || value instanceof Int8Array ||
          value instanceof Uint32Array || value instanceof Uint16Array || value instanceof Uint8ClampedArray) {
        // Convert typed arrays to regular arrays
        obj[key] = Array.from(value);
      } else if (value instanceof Uint8Array || value instanceof Buffer) {
        // Keep binary data as is (will be processed by processRows)
        obj[key] = value;
      } else if (value instanceof Date) {
        // Keep dates as is
        obj[key] = value;
      } else if (typeof value === 'bigint') {
        // Convert BigInt to number or string
        obj[key] = Number(value);
      } else if (value !== null && typeof value === 'object') {
        // Recursively handle nested objects (e.g., Arrow structs)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((value as any).toJSON) {
          // If object has toJSON method, use it
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          obj[key] = (value as any).toJSON();
        } else {
          // Otherwise, recursively convert
          obj[key] = this.recordToObject(value as Record<string, unknown>);
        }
      } else {
        obj[key] = value;
      }
    }

    return obj;
  }

  /**
   * Parse a SQL SELECT statement to extract table name and WHERE clause
   * This is a simple parser for basic SQL queries.
   *
   * @param sql - SQL SELECT statement
   * @returns Parsed SQL components
   */
  private parseSql(sql: string): { tableName?: string; whereClause?: string } {
    // Normalize SQL (remove extra whitespace, make uppercase for matching)
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');
    const upperSql = normalizedSql.toUpperCase();

    // Extract table name - look for FROM clause
    const fromMatch = normalizedSql.match(/FROM\s+(\w+)/i);
    const tableName = fromMatch?.[1];

    // Extract WHERE clause
    const whereIndex = upperSql.indexOf(' WHERE ');
    let whereClause: string | undefined;

    if (whereIndex !== -1) {
      // Get everything after WHERE
      let wherePart = normalizedSql.substring(whereIndex + 7).trim();

      // Remove ORDER BY, LIMIT, etc.
      const orderByIndex = wherePart.toUpperCase().indexOf(' ORDER BY ');
      if (orderByIndex !== -1) {
        wherePart = wherePart.substring(0, orderByIndex).trim();
      }

      const limitIndex = wherePart.toUpperCase().indexOf(' LIMIT ');
      if (limitIndex !== -1) {
        wherePart = wherePart.substring(0, limitIndex).trim();
      }

      whereClause = wherePart;
    }

    return { tableName, whereClause };
  }

  /**
   * Convert a SQL WHERE clause string to FilterCondition array
   * This is a simple converter for basic conditions.
   *
   * @param whereClause - SQL WHERE clause (without the WHERE keyword)
   * @returns Array of FilterCondition objects
   */
  private sqlWhereToFilters(whereClause: string): FilterCondition[] {
    const filters: FilterCondition[] = [];

    // Split by AND (simple approach)
    const conditions = whereClause.split(/\s+AND\s+/i);

    for (const condition of conditions) {
      const filter = this.parseCondition(condition.trim());
      if (filter) {
        filters.push(filter);
      }
    }

    return filters;
  }

  /**
   * Parse a single condition like "column = 'value'" or "age > 18"
   *
   * @param condition - Single condition string
   * @returns FilterCondition or null if unable to parse
   */
  private parseCondition(condition: string): FilterCondition | null {
    // Match patterns like: column = value, column > value, column >= value, etc.
    const match = condition.match(/^(\w+)\s*(=|>|>=|<|<=)\s*(.+)$/);

    if (!match) {
      return null;
    }

    const column = match[1];
    const operatorSymbol = match[2];
    let value: string | number = match[3].trim();

    // Remove quotes from string values
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
      value = value.slice(1, -1);
    } else {
      // Try to parse as number
      const numValue = Number(value);
      if (!isNaN(numValue)) {
        value = numValue;
      }
    }

    // Map SQL operators to FilterCondition operators
    const operatorMap: Record<string, FilterCondition['operator']> = {
      '=': 'eq',
      '>': 'gt',
      '>=': 'gte',
      '<': 'lt',
      '<=': 'lte',
    };

    const operator = operatorMap[operatorSymbol];

    if (!operator) {
      return null;
    }

    return {
      column,
      operator,
      value,
    };
  }
}

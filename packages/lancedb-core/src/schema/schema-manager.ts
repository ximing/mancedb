/**
 * Schema Manager
 * Provides utilities for parsing and managing LanceDB table schemas
 */

import { Service } from 'typedi';
import type { Table } from '@lancedb/lancedb';
import type { ColumnInfo, TableSchema } from '@mancedb/dto';
import { mapArrowTypeToDisplayType, parseVectorType, getTypeByteSize } from '../utils/arrow-mapper.js';

/**
 * SchemaManager provides methods to parse and manage Apache Arrow schemas
 * from LanceDB tables. It converts Arrow schema fields into standardized
 * ColumnInfo objects for use throughout the application.
 *
 * @example
 * ```typescript
 * const schemaManager = Container.get(SchemaManager);
 * const table = await connection.openTable('my_table');
 * const schema = await schemaManager.getTableSchema(table, 'my_table');
 * console.log(schema.columns);
 * ```
 */
@Service()
export class SchemaManager {
  /**
   * Get the schema information for a LanceDB table
   *
   * @param table - The LanceDB Table instance
   * @param tableName - The name of the table (for the returned schema object)
   * @returns TableSchema object containing column information and metadata
   *
   * @example
   * ```typescript
   * const table = await connection.openTable('users');
   * const schema = await schemaManager.getTableSchema(table, 'users');
   * console.log(`Table has ${schema.columns.length} columns`);
   * console.log(`Row count: ${schema.rowCount}`);
   * ```
   */
  async getTableSchema(table: Table, tableName: string): Promise<TableSchema> {
    // Get schema from the table (schema is a method that returns Promise<Schema>)
    const schema = await table.schema();
    const rowCount = await table.countRows();

    // Parse columns from schema
    const columns: ColumnInfo[] = [];
    for (const field of schema.fields) {
      const columnInfo = this.parseField(field);
      columns.push(columnInfo);
    }

    // Estimate size based on row count and column types
    const sizeBytes = this.estimateTableSize(rowCount, columns);

    return {
      name: tableName,
      columns,
      rowCount,
      sizeBytes,
    };
  }

  /**
   * Parse an Arrow field to ColumnInfo
   *
   * @param field - The Arrow field object from schema.fields
   * @returns ColumnInfo object with parsed type information
   *
   * @example
   * ```typescript
   * const field = schema.fields[0];
   * const columnInfo = schemaManager.parseField(field);
   * // { name: 'id', type: 'int64', nullable: false }
   * ```
   */
  parseField(field: { name: string; type: { toString(): string }; nullable: boolean }): ColumnInfo {
    const typeStr = field.type.toString();
    const columnInfo: ColumnInfo = {
      name: field.name,
      type: mapArrowTypeToDisplayType(typeStr),
      nullable: field.nullable,
    };

    // Check if it's a fixed_size_list (vector) type
    const vectorInfo = parseVectorType(typeStr);
    if (vectorInfo) {
      columnInfo.vectorDimension = vectorInfo.dimension;
    }

    return columnInfo;
  }

  /**
   * Get column information for a specific column by name
   *
   * @param table - The LanceDB Table instance
   * @param columnName - The name of the column to find
   * @returns ColumnInfo if found, null otherwise
   *
   * @example
   * ```typescript
   * const column = await schemaManager.getColumnInfo(table, 'embedding');
   * if (column) {
   *   console.log(`Type: ${column.type}, Dimension: ${column.vectorDimension}`);
   * }
   * ```
   */
  async getColumnInfo(table: Table, columnName: string): Promise<ColumnInfo | null> {
    const schema = await table.schema();
    const field = schema.fields.find((f) => f.name === columnName);

    if (!field) {
      return null;
    }

    return this.parseField(field);
  }

  /**
   * Get all column names from a table schema
   *
   * @param table - The LanceDB Table instance
   * @returns Array of column names
   *
   * @example
   * ```typescript
   * const columnNames = await schemaManager.getColumnNames(table);
   * // ['id', 'name', 'embedding', 'created_at']
   * ```
   */
  async getColumnNames(table: Table): Promise<string[]> {
    const schema = await table.schema();
    return schema.fields.map((field) => field.name);
  }

  /**
   * Check if a column exists in the table schema
   *
   * @param table - The LanceDB Table instance
   * @param columnName - The name of the column to check
   * @returns True if the column exists
   *
   * @example
   * ```typescript
   * const hasEmbedding = await schemaManager.hasColumn(table, 'embedding');
   * ```
   */
  async hasColumn(table: Table, columnName: string): Promise<boolean> {
    const schema = await table.schema();
    return schema.fields.some((field) => field.name === columnName);
  }

  /**
   * Get only vector columns from the table schema
   *
   * @param table - The LanceDB Table instance
   * @returns Array of ColumnInfo for vector columns only
   *
   * @example
   * ```typescript
   * const vectorColumns = await schemaManager.getVectorColumns(table);
   * // [{ name: 'embedding', type: 'vector(float32, 384d)', nullable: false, vectorDimension: 384 }]
   * ```
   */
  async getVectorColumns(table: Table): Promise<ColumnInfo[]> {
    const schema = await table.schema();
    const columns: ColumnInfo[] = [];

    for (const field of schema.fields) {
      const columnInfo = this.parseField(field);
      if (columnInfo.vectorDimension) {
        columns.push(columnInfo);
      }
    }

    return columns;
  }

  /**
   * Estimate table size based on row count and column types
   *
   * @param rowCount - Number of rows in the table
   * @param columns - Array of ColumnInfo objects
   * @returns Estimated size in bytes
   *
   * @example
   * ```typescript
   * const size = schemaManager.estimateTableSize(10000, schema.columns);
   * console.log(`Estimated size: ${size} bytes`);
   * ```
   */
  estimateTableSize(rowCount: number, columns: ColumnInfo[]): number {
    let bytesPerRow = 0;

    for (const col of columns) {
      bytesPerRow += getTypeByteSize(col.type, col.vectorDimension);
    }

    return rowCount * bytesPerRow;
  }
}

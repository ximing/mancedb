/**
 * Database DTOs
 * Shared types for database information and table metadata
 */

/**
 * Table information DTO
 * Represents metadata about a single table in the database
 */
export interface TableInfo {
  /** Table name */
  name: string;
  /** Number of rows in the table */
  rowCount: number;
  /** Estimated size in bytes */
  sizeBytes: number;
}

/**
 * Database information DTO
 * Represents metadata about a database connection
 */
export interface DatabaseInfo {
  /** Database/connection name */
  name: string;
  /** Storage type: local filesystem or S3 */
  type: 'local' | 's3';
  /** Database path (local path or S3 URI) */
  path: string;
  /** Number of tables in the database */
  tableCount: number;
  /** List of tables in the database */
  tables: TableInfo[];
}

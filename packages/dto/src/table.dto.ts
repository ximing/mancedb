/**
 * Table DTOs
 * Shared types for table schema, columns, and table operations
 */

/**
 * Column information DTO
 * Represents metadata about a single column in a table
 */
export interface ColumnInfo {
  /** Column name */
  name: string;
  /** Display type (e.g., 'string', 'int64', 'vector(float32, 384d)') */
  type: string;
  /** Whether the column allows null values */
  nullable: boolean;
  /** For vector columns, the dimension of the vector */
  vectorDimension?: number;
}

/**
 * Table schema DTO
 * Represents the complete schema of a table
 */
export interface TableSchema {
  /** Table name */
  name: string;
  /** List of columns in the table */
  columns: ColumnInfo[];
  /** Number of rows in the table */
  rowCount: number;
  /** Estimated size in bytes */
  sizeBytes: number;
  /** Optional creation timestamp */
  createdAt?: number;
}

/**
 * Filter condition for table queries
 * Used to build WHERE clauses for filtering table data
 */
export interface FilterCondition {
  /** Column name to filter on */
  column: string;
  /** Filter operator */
  operator: 'contains' | 'eq' | 'gt' | 'gte' | 'lt' | 'lte';
  /** Value to filter by */
  value: string | number;
}

/**
 * Options for querying table data with pagination, sorting, and filtering
 */
export interface TableDataQueryOptions {
  /** Page number (1-based) */
  page: number;
  /** Number of rows per page */
  pageSize: number;
  /** Column to sort by */
  sortColumn?: string;
  /** Sort order */
  sortOrder?: 'asc' | 'desc';
  /** Filter conditions to apply */
  filters?: FilterCondition[];
}

/**
 * Result of a table data query
 * Contains paginated rows and metadata
 */
export interface TableDataResult {
  /** Array of row data */
  rows: Record<string, unknown>[];
  /** Total number of rows matching the query */
  totalCount: number;
  /** Current page number */
  page: number;
  /** Number of rows per page */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Options for adding a new column to a table
 */
export interface AddColumnOptions {
  /** Column name */
  name: string;
  /** Column data type */
  type: 'int64' | 'float64' | 'string' | 'binary' | 'vector';
  /** For vector type, the dimension */
  vectorDimension?: number;
  /** Whether the column allows null values */
  nullable?: boolean;
}

/**
 * Result of adding a column
 */
export interface AddColumnResult {
  /** New version number of the table */
  version: number;
}

/**
 * Result of dropping a column
 */
export interface DropColumnResult {
  /** New version number of the table */
  version: number;
}

/**
 * Result of renaming a table
 */
export interface RenameTableResult {
  /** Previous table name */
  oldName: string;
  /** New table name */
  newName: string;
}

/**
 * Result of deleting a table
 */
export interface DeleteTableResult {
  /** Name of the deleted table */
  name: string;
  /** Whether the deletion was successful */
  deleted: boolean;
}

/**
 * Result of deleting rows from a table
 */
export interface DeleteRowsResult {
  /** Number of rows deleted */
  deletedCount: number;
}

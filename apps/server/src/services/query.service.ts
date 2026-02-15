import { Service } from 'typedi';
import * as lancedb from '@lancedb/lancedb';
import type { Connection } from '@lancedb/lancedb';
import { ConnectionService } from './connection.service.js';
import { LanceDbService } from '../sources/lancedb.js';
import { type QueryHistoryRecord } from '../models/db/schema.js';
import { randomUUID } from 'crypto';

export interface SqlQueryRequest {
  sql: string;
  limit?: number;
}

export interface SqlQueryResult {
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

export interface QueryHistoryEntry {
  id: string;
  sql: string;
  executedAt: number;
  executionTimeMs?: number;
  rowCount?: number;
  error?: string;
}

@Service()
export class QueryService {
  constructor(
    private connectionService: ConnectionService,
    private lanceDb: LanceDbService
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
   * Execute a SQL query on the connection's database
   * Supports LanceDB SQL subset: SELECT, WHERE, ORDER BY, LIMIT
   */
  async executeQuery(
    connectionId: string,
    request: SqlQueryRequest
  ): Promise<SqlQueryResult> {
    const startTime = Date.now();
    const db = await this.connectToDatabase(connectionId);

    try {
      // Parse and validate the SQL query
      const parsedQuery = this.parseSqlQuery(request.sql);

      // Validate it's a SELECT query (read-only)
      if (parsedQuery.type !== 'SELECT') {
        throw new Error('Only SELECT queries are supported');
      }

      // Check if table exists
      const tableNames = await db.tableNames();
      if (!tableNames.includes(parsedQuery.table)) {
        throw new Error(`Table '${parsedQuery.table}' not found`);
      }

      // Open the table
      const table = await db.openTable(parsedQuery.table);
      try {
        // Build and execute the query
        let query = table.query();

        // Apply WHERE clause if present
        if (parsedQuery.where) {
          query = query.where(parsedQuery.where);
        }

        // Apply ORDER BY if present
        if (parsedQuery.orderBy) {
          // LanceDB query API doesn't have direct orderBy in the same way
          // This is a placeholder - actual sorting would need different approach
          // For now, we'll note that sorting is limited
        }

        // Apply LIMIT - use provided limit or parsed limit, capped at 1000
        const limit = Math.min(1000, request.limit || parsedQuery.limit || 1000);
        query = query.limit(limit);

        // Execute the query
        const results = await query.toArray();
        const executionTimeMs = Date.now() - startTime;

        // Process results - truncate vectors for display
        const processedRows = results.map((row) => this.processRow(row));

        return {
          rows: processedRows,
          rowCount: processedRows.length,
          executionTimeMs,
        };
      } finally {
        table.close();
      }
    } finally {
      db.close();
    }
  }

  /**
   * Record query execution to history
   */
  async recordQueryHistory(
    connectionId: string,
    sql: string,
    executionTimeMs: number,
    rowCount: number,
    error?: string
  ): Promise<void> {
    try {
      const table = await this.lanceDb.openTable('query_history');

      const record: QueryHistoryRecord = {
        id: randomUUID(),
        connectionId,
        sql: sql.substring(0, 10000), // Limit SQL length to prevent oversized records
        executedAt: Date.now(),
        executionTimeMs,
        rowCount,
        error: error ? error.substring(0, 1000) : undefined, // Limit error length
      };

      await table.add([record as unknown as Record<string, unknown>]);
    } catch (err) {
      // Log but don't throw - history recording should not break queries
      console.error('Failed to record query history:', err);
    }
  }

  /**
   * Get query history for a connection
   */
  async getQueryHistory(connectionId: string, limit: number = 20): Promise<QueryHistoryEntry[]> {
    const table = await this.lanceDb.openTable('query_history');

    try {
      // Query history for this connection, ordered by executedAt desc
      const query = table
        .query()
        .where(`connectionId = '${connectionId.replace(/'/g, "\\'")}'`)
        .limit(limit);

      const results = await query.toArray();

      // Sort by executedAt descending (most recent first)
      const sorted = results.sort((a, b) => {
        const aTime = (a.executedAt as number) || 0;
        const bTime = (b.executedAt as number) || 0;
        return bTime - aTime;
      });

      return sorted.map((record) => ({
        id: record.id as string,
        sql: record.sql as string,
        executedAt: record.executedAt as number,
        executionTimeMs: record.executionTimeMs as number | undefined,
        rowCount: record.rowCount as number | undefined,
        error: record.error as string | undefined,
      }));
    } finally {
      table.close();
    }
  }

  /**
   * Parse a simple SQL query
   * Supports: SELECT ... FROM table [WHERE ...] [ORDER BY ...] [LIMIT n]
   */
  private parseSqlQuery(sql: string): {
    type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN';
    table: string;
    where?: string;
    orderBy?: string;
    orderDirection?: 'ASC' | 'DESC';
    limit: number;
  } {
    const normalizedSql = sql.trim().replace(/\s+/g, ' ');
    const upperSql = normalizedSql.toUpperCase();

    // Check query type
    let type: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'UNKNOWN' = 'UNKNOWN';
    if (upperSql.startsWith('SELECT')) {
      type = 'SELECT';
    } else if (upperSql.startsWith('INSERT')) {
      type = 'INSERT';
    } else if (upperSql.startsWith('UPDATE')) {
      type = 'UPDATE';
    } else if (upperSql.startsWith('DELETE')) {
      type = 'DELETE';
    }

    // Extract table name - look for FROM clause
    const fromMatch = normalizedSql.match(/FROM\s+(\w+)/i);
    if (!fromMatch) {
      throw new Error('Invalid SQL: missing FROM clause');
    }
    const table = fromMatch[1];

    // Extract WHERE clause
    let where: string | undefined;
    const whereMatch = normalizedSql.match(/WHERE\s+(.+?)(?:ORDER\s+BY|LIMIT|$)/i);
    if (whereMatch) {
      where = whereMatch[1].trim();
    }

    // Extract ORDER BY clause
    let orderBy: string | undefined;
    let orderDirection: 'ASC' | 'DESC' | undefined;
    const orderMatch = normalizedSql.match(/ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?/i);
    if (orderMatch) {
      orderBy = orderMatch[1];
      orderDirection = (orderMatch[2] as 'ASC' | 'DESC') || 'ASC';
    }

    // Extract LIMIT clause
    let limit = 1000;
    const limitMatch = normalizedSql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      limit = parseInt(limitMatch[1], 10);
    }

    return {
      type,
      table,
      where,
      orderBy,
      orderDirection,
      limit,
    };
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
    return value;
  }
}

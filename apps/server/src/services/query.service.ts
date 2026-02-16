import { Service, Inject } from 'typedi';
import { ConnectionManager, QueryEngine } from '@mancedb/lancedb-core';
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
    private lanceDb: LanceDbService,
    @Inject(() => ConnectionManager) private connectionManager: ConnectionManager,
    @Inject(() => QueryEngine) private queryEngine: QueryEngine
  ) {}

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
   * Execute a SQL query on the connection's database
   * Supports LanceDB SQL subset: SELECT, WHERE, ORDER BY, LIMIT
   * Uses QueryEngine from lancedb-core for query execution
   */
  async executeQuery(
    connectionId: string,
    request: SqlQueryRequest
  ): Promise<SqlQueryResult> {
    const startTime = Date.now();
    const uri = await this.getConnectionUri(connectionId);

    // Use QueryEngine to execute SQL
    const result = await this.queryEngine.executeSql(uri, request.sql);

    const executionTimeMs = Date.now() - startTime;

    return {
      rows: result.rows,
      rowCount: result.totalCount,
      executionTimeMs,
    };
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
}

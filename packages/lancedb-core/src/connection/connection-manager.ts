/**
 * Connection Manager
 * Manages LanceDB connections with support for local and S3 storage
 * Uses TypeDI for dependency injection and singleton pattern for connection caching
 */

import { Service } from 'typedi';
import * as lancedb from '@lancedb/lancedb';
import type { Connection } from '@lancedb/lancedb';

/**
 * Connection options for LanceDB
 */
export interface ConnectionOptions {
  /** Storage type: 'local' or 's3' */
  storageType?: 'local' | 's3';
  /** S3 configuration (required when storageType is 's3') */
  s3Config?: S3ConnectionConfig;
}

/**
 * S3 connection configuration
 */
export interface S3ConnectionConfig {
  /** S3 bucket name */
  bucket: string;
  /** S3 region */
  region?: string;
  /** AWS Access Key ID */
  awsAccessKeyId?: string;
  /** AWS Secret Access Key */
  awsSecretAccessKey?: string;
  /** Custom S3 endpoint (optional) */
  endpoint?: string;
  /** Key prefix/path within the bucket */
  prefix?: string;
}

/**
 * Active connection entry with metadata
 */
interface ConnectionEntry {
  connection: Connection;
  uri: string;
  options: ConnectionOptions;
  createdAt: Date;
}

/**
 * ConnectionManager manages LanceDB connections using a singleton pattern.
 * It caches connections by URI to avoid creating multiple connections to the same database.
 *
 * @example
 * ```typescript
 * const manager = Container.get(ConnectionManager);
 * const conn = await manager.connect('/path/to/db');
 * const s3Conn = await manager.connect('s3://bucket/prefix', {
 *   storageType: 's3',
 *   s3Config: { bucket: 'my-bucket', region: 'us-east-1' }
 * });
 * ```
 */
@Service()
export class ConnectionManager {
  private connections: Map<string, ConnectionEntry> = new Map();

  /**
   * Connect to a LanceDB database
   *
   * @param uri - Database URI (local path or S3 URI)
   * @param options - Connection options for S3 or local storage
   * @returns LanceDB Connection instance
   *
   * @example
   * ```typescript
   * // Local connection
   * const conn = await manager.connect('/data/lancedb');
   *
   * // S3 connection
   * const conn = await manager.connect('s3://my-bucket/db', {
   *   storageType: 's3',
   *   s3Config: {
   *     bucket: 'my-bucket',
   *     region: 'us-east-1',
   *     awsAccessKeyId: 'AKIA...',
   *     awsSecretAccessKey: 'secret...'
   *   }
   * });
   * ```
   */
  async connect(uri: string, options: ConnectionOptions = {}): Promise<Connection> {
    // Return cached connection if exists
    const existing = this.connections.get(uri);
    if (existing) {
      return existing.connection;
    }

    // Create new connection
    const connection = await this.createConnection(uri, options);

    // Cache the connection
    const entry: ConnectionEntry = {
      connection,
      uri,
      options,
      createdAt: new Date(),
    };
    this.connections.set(uri, entry);

    return connection;
  }

  /**
   * Create a new LanceDB connection
   *
   * @param uri - Database URI
   * @param options - Connection options
   * @returns New Connection instance
   */
  private async createConnection(uri: string, options: ConnectionOptions): Promise<Connection> {
    const storageType = options.storageType || 'local';

    if (storageType === 's3' || uri.startsWith('s3://')) {
      return this.createS3Connection(uri, options.s3Config);
    }

    // Local connection
    return lancedb.connect(uri);
  }

  /**
   * Create an S3 connection with proper configuration
   *
   * @param uri - S3 URI (s3://bucket/prefix or custom path)
   * @param s3Config - S3 configuration
   * @returns Connection instance for S3 storage
   */
  private async createS3Connection(
    uri: string,
    s3Config?: S3ConnectionConfig
  ): Promise<Connection> {
    if (!s3Config) {
      throw new Error('S3 configuration is required for S3 connections');
    }

    const storageOptions: Record<string, string> = {
      virtualHostedStyleRequest: 'true',
      conditionalPut: 'disabled',
    };

    if (s3Config.awsAccessKeyId) {
      storageOptions.awsAccessKeyId = s3Config.awsAccessKeyId;
    }

    if (s3Config.awsSecretAccessKey) {
      storageOptions.awsSecretAccessKey = s3Config.awsSecretAccessKey;
    }

    if (s3Config.region) {
      storageOptions.awsRegion = s3Config.region;
    }

    if (s3Config.endpoint) {
      storageOptions.awsEndpoint = s3Config.endpoint;
    }

    return lancedb.connect(uri, { storageOptions });
  }

  /**
   * Get an existing connection by URI
   *
   * @param uri - Database URI
   * @returns Connection instance or undefined if not found
   *
   * @example
   * ```typescript
   * const conn = manager.getConnection('/data/lancedb');
   * if (conn) {
   *   const tables = await conn.tableNames();
   * }
   * ```
   */
  getConnection(uri: string): Connection | undefined {
    const entry = this.connections.get(uri);
    return entry?.connection;
  }

  /**
   * Check if a connection exists for the given URI
   *
   * @param uri - Database URI
   * @returns True if connection exists
   */
  hasConnection(uri: string): boolean {
    return this.connections.has(uri);
  }

  /**
   * Disconnect from a specific database
   *
   * @param uri - Database URI to disconnect
   * @returns True if disconnected, false if connection was not found
   *
   * @example
   * ```typescript
   * await manager.disconnect('/data/lancedb');
   * ```
   */
  async disconnect(uri: string): Promise<boolean> {
    const entry = this.connections.get(uri);
    if (!entry) {
      return false;
    }

    try {
      // Close the connection
      entry.connection.close();
    } catch (error) {
      console.warn(`Error closing connection to ${uri}:`, error);
    }

    this.connections.delete(uri);
    return true;
  }

  /**
   * Disconnect all active connections
   *
   * @example
   * ```typescript
   * await manager.disconnectAll();
   * ```
   */
  async disconnectAll(): Promise<void> {
    for (const [uri, entry] of this.connections.entries()) {
      try {
        entry.connection.close();
      } catch (error) {
        console.warn(`Error closing connection to ${uri}:`, error);
      }
    }
    this.connections.clear();
  }

  /**
   * Get all active connection URIs
   *
   * @returns Array of connection URIs
   */
  getActiveConnections(): string[] {
    return Array.from(this.connections.keys());
  }

  /**
   * Get connection count
   *
   * @returns Number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }
}

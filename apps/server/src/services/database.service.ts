import { Service } from 'typedi';
import * as lancedb from '@lancedb/lancedb';
import type { Connection } from '@lancedb/lancedb';
import { ConnectionService } from './connection.service.js';

export interface TableInfo {
  name: string;
  rowCount: number;
  sizeBytes: number;
}

export interface DatabaseInfo {
  name: string;
  type: 'local' | 's3';
  path: string;
  tableCount: number;
  tables: TableInfo[];
}

@Service()
export class DatabaseService {
  constructor(private connectionService: ConnectionService) {}

  /**
   * Connect to a LanceDB database using connection configuration
   */
  async connectToDatabase(connectionId: string): Promise<Connection> {
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
   * Get all tables in the database
   */
  async getTables(connectionId: string): Promise<TableInfo[]> {
    const db = await this.connectToDatabase(connectionId);
    try {
      const tableNames = await db.tableNames();
      const tables: TableInfo[] = [];

      for (const name of tableNames) {
        try {
          const table = await db.openTable(name);
          const rowCount = await table.countRows();

          // Get table size by querying stats (approximate)
          // LanceDB doesn't have a direct size API, so we estimate based on row count
          tables.push({
            name,
            rowCount,
            sizeBytes: 0, // Will be populated if we can get more info
          });

          table.close();
        } catch (error) {
          console.warn(`Failed to get info for table ${name}:`, error);
          tables.push({
            name,
            rowCount: 0,
            sizeBytes: 0,
          });
        }
      }

      return tables;
    } finally {
      db.close();
    }
  }

  /**
   * Get database information including all tables
   */
  async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo | null> {
    const connection = await this.connectionService.getConnectionById(connectionId);
    if (!connection) {
      return null;
    }

    const db = await this.connectToDatabase(connectionId);
    try {
      const tableNames = await db.tableNames();
      const tables: TableInfo[] = [];

      for (const name of tableNames) {
        try {
          const table = await db.openTable(name);
          const rowCount = await table.countRows();

          tables.push({
            name,
            rowCount,
            sizeBytes: 0,
          });

          table.close();
        } catch (error) {
          console.warn(`Failed to get info for table ${name}:`, error);
          tables.push({
            name,
            rowCount: 0,
            sizeBytes: 0,
          });
        }
      }

      return {
        name: connection.name,
        type: connection.type,
        path: connection.type === 'local' ? connection.localPath || '' : `s3://${connection.s3Bucket}`,
        tableCount: tables.length,
        tables,
      };
    } finally {
      db.close();
    }
  }

  /**
   * Helper to decrypt encrypted values (if they appear encrypted)
   */
  private async decryptIfNeeded(value: string): Promise<string> {
    // The value is already decrypted by the connection service when needed
    // This is a placeholder for any additional decryption logic
    return value;
  }
}

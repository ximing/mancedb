import { Service, Inject } from 'typedi';
import type { Connection } from '@lancedb/lancedb';
import { ConnectionManager, TableManager } from '@mancedb/lancedb-core';
import type { TableInfo, DatabaseInfo } from '@mancedb/dto';
import { ConnectionService } from './connection.service.js';

@Service()
export class DatabaseService {
  constructor(
    private connectionService: ConnectionService,
    @Inject(() => ConnectionManager) private connectionManager: ConnectionManager,
    @Inject(() => TableManager) private tableManager: TableManager
  ) {}

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
      return await this.connectionManager.connect(connection.localPath);
    } else if (connection.type === 's3') {
      if (!connection.s3Bucket || !connection.s3Region) {
        throw new Error('S3 configuration is incomplete');
      }

      // Decrypt credentials (optional for public S3 buckets)
      const accessKey = connection.s3AccessKey
        ? await this.decryptIfNeeded(connection.s3AccessKey)
        : undefined;
      const secretKey = connection.s3SecretKey
        ? await this.decryptIfNeeded(connection.s3SecretKey)
        : undefined;

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
   * Get all tables in the database
   */
  async getTables(connectionId: string): Promise<TableInfo[]> {
    const connection = await this.connectionService.getConnectionWithSecrets(connectionId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const uri = this.getConnectionUri(connection);
    return await this.tableManager.getTables(uri);
  }

  /**
   * Get database information including all tables
   */
  async getDatabaseInfo(connectionId: string): Promise<DatabaseInfo | null> {
    const connection = await this.connectionService.getConnectionById(connectionId);
    if (!connection) {
      return null;
    }

    const uri = this.getConnectionUri(connection);
    const tables = await this.tableManager.getTables(uri);

    return {
      name: connection.name,
      type: connection.type,
      path: connection.type === 'local' ? connection.localPath || '' : `s3://${connection.s3Bucket}`,
      tableCount: tables.length,
      tables,
    };
  }

  /**
   * Helper to get connection URI from connection config
   */
  private getConnectionUri(connection: {
    type: 'local' | 's3';
    localPath?: string | null;
    s3Bucket?: string | null;
  }): string {
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
   * Helper to decrypt encrypted values (if they appear encrypted)
   */
  private async decryptIfNeeded(value: string): Promise<string> {
    // The value is already decrypted by the connection service when needed
    // This is a placeholder for any additional decryption logic
    return value;
  }
}

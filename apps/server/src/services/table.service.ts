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
   * Helper to decrypt encrypted values (if they appear encrypted)
   */
  private async decryptIfNeeded(value: string): Promise<string> {
    // The value is already decrypted by the connection service when needed
    // This is a placeholder for any additional decryption logic
    return value;
  }
}

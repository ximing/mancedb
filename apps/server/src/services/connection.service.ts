import { Service } from 'typedi';
import * as bcrypt from 'bcrypt';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { LanceDbService } from '../sources/lancedb.js';
import type { ConnectionRecord } from '../models/db/schema.js';
import { generateUid } from '../utils/id.js';
import { config } from '../config/config.js';

// Type for creating a new connection (without auto-generated fields)
export interface CreateConnectionInput {
  name: string;
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  dbUsername?: string;
  dbPassword?: string;
}

// Type for updating a connection
export interface UpdateConnectionInput {
  name?: string;
  type?: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  dbUsername?: string;
  dbPassword?: string;
}

// Public connection info (without sensitive fields)
export interface ConnectionPublicInfo {
  id: string;
  name: string;
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  dbUsername?: string;
  createdAt: number;
  updatedAt: number;
  lastConnectedAt?: number;
}

@Service()
export class ConnectionService {
  private readonly ENCRYPTION_KEY: Buffer;

  constructor(private lanceDb: LanceDbService) {
    // Derive a 32-byte key from the JWT secret for AES encryption
    const secret = config.jwt.secret;
    this.ENCRYPTION_KEY = scryptSync(secret, 'salt', 32);
  }

  /**
   * Encrypt sensitive data using AES-256-GCM
   */
  private encrypt(text: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    // Store IV + authTag + encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt sensitive data using AES-256-GCM
   */
  private decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted text format');
    }
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const decipher = createDecipheriv('aes-256-gcm', this.ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Hash password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  /**
   * Verify password using bcrypt
   */
  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Create a new connection
   */
  async createConnection(input: CreateConnectionInput): Promise<ConnectionRecord> {
    try {
      // Check if connection with same name already exists
      const existing = await this.findConnectionByName(input.name);
      if (existing) {
        throw new Error('Connection with this name already exists');
      }

      const now = Date.now();
      const connection: ConnectionRecord = {
        id: generateUid(),
        name: input.name,
        type: input.type,
        localPath: input.localPath,
        s3Bucket: input.s3Bucket,
        s3Region: input.s3Region,
        s3AccessKey: input.s3AccessKey ? this.encrypt(input.s3AccessKey) : undefined,
        s3SecretKey: input.s3SecretKey ? this.encrypt(input.s3SecretKey) : undefined,
        s3Endpoint: input.s3Endpoint,
        dbUsername: input.dbUsername,
        dbPasswordHash: input.dbPassword ? await this.hashPassword(input.dbPassword) : undefined,
        createdAt: now,
        updatedAt: now,
      };

      const table = await this.lanceDb.openTable('connections');
      await table.add([connection as unknown as Record<string, unknown>]);

      return connection;
    } catch (error) {
      console.error('Error creating connection:', error);
      throw error;
    }
  }

  /**
   * Get all connections (without sensitive fields)
   */
  async getAllConnections(): Promise<ConnectionPublicInfo[]> {
    try {
      const table = await this.lanceDb.openTable('connections');
      const results = await table.query().toArray();

      return results.map((record) => this.toPublicInfo(record as ConnectionRecord));
    } catch (error) {
      console.error('Error getting all connections:', error);
      throw error;
    }
  }

  /**
   * Get a single connection by ID (without sensitive fields)
   */
  async getConnectionById(id: string): Promise<ConnectionPublicInfo | null> {
    try {
      const table = await this.lanceDb.openTable('connections');
      const results = await table.query().where(`id = '${id}'`).limit(1).toArray();

      if (results.length === 0) {
        return null;
      }

      return this.toPublicInfo(results[0] as ConnectionRecord);
    } catch (error) {
      console.error('Error getting connection by ID:', error);
      throw error;
    }
  }

  /**
   * Get a connection with sensitive fields (for internal use like testing connection)
   */
  async getConnectionWithSecrets(id: string): Promise<ConnectionRecord | null> {
    try {
      const table = await this.lanceDb.openTable('connections');
      const results = await table.query().where(`id = '${id}'`).limit(1).toArray();

      if (results.length === 0) {
        return null;
      }

      return results[0] as ConnectionRecord;
    } catch (error) {
      console.error('Error getting connection with secrets:', error);
      throw error;
    }
  }

  /**
   * Find connection by name
   */
  async findConnectionByName(name: string): Promise<ConnectionRecord | null> {
    try {
      const table = await this.lanceDb.openTable('connections');
      const results = await table.query().where(`name = '${name}'`).limit(1).toArray();

      return results.length > 0 ? (results[0] as ConnectionRecord) : null;
    } catch (error) {
      console.error('Error finding connection by name:', error);
      throw error;
    }
  }

  /**
   * Update a connection
   */
  async updateConnection(id: string, input: UpdateConnectionInput): Promise<ConnectionPublicInfo | null> {
    try {
      const table = await this.lanceDb.openTable('connections');

      // Find existing connection
      const existing = await this.getConnectionWithSecrets(id);
      if (!existing) {
        return null;
      }

      // Check name uniqueness if name is being updated
      if (input.name && input.name !== existing.name) {
        const duplicate = await this.findConnectionByName(input.name);
        if (duplicate) {
          throw new Error('Connection with this name already exists');
        }
      }

      // Build update data
      const updateData: Record<string, string> = {
        updatedAt: String(Date.now()),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.type !== undefined) updateData.type = input.type;
      if (input.localPath !== undefined) updateData.localPath = input.localPath;
      if (input.s3Bucket !== undefined) updateData.s3Bucket = input.s3Bucket;
      if (input.s3Region !== undefined) updateData.s3Region = input.s3Region;
      if (input.s3Endpoint !== undefined) updateData.s3Endpoint = input.s3Endpoint;
      if (input.dbUsername !== undefined) updateData.dbUsername = input.dbUsername;

      // Encrypt sensitive fields
      if (input.s3AccessKey !== undefined) {
        updateData.s3AccessKey = input.s3AccessKey ? this.encrypt(input.s3AccessKey) : '';
      }
      if (input.s3SecretKey !== undefined) {
        updateData.s3SecretKey = input.s3SecretKey ? this.encrypt(input.s3SecretKey) : '';
      }
      if (input.dbPassword !== undefined) {
        updateData.dbPasswordHash = input.dbPassword ? await this.hashPassword(input.dbPassword) : '';
      }

      await table.update(updateData, { where: `id = '${id}'` });

      // Return updated connection
      return this.getConnectionById(id);
    } catch (error) {
      console.error('Error updating connection:', error);
      throw error;
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(id: string): Promise<boolean> {
    try {
      const table = await this.lanceDb.openTable('connections');

      // Check if connection exists
      const existing = await this.getConnectionById(id);
      if (!existing) {
        return false;
      }

      // Delete from table using LanceDB's delete method
      await table.delete(`id = '${id}'`);

      return true;
    } catch (error) {
      console.error('Error deleting connection:', error);
      throw error;
    }
  }

  /**
   * Test if a connection is valid (can connect to LanceDB)
   */
  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const connection = await this.getConnectionWithSecrets(id);
      if (!connection) {
        return { success: false, message: 'Connection not found' };
      }

      // Import lancedb dynamically to test connection
      const lancedb = await import('@lancedb/lancedb');

      if (connection.type === 'local') {
        if (!connection.localPath) {
          return { success: false, message: 'Local path is not configured' };
        }

        try {
          const db = await lancedb.connect(connection.localPath);
          // Try to list tables to verify connection
          await db.tableNames();
          await db.close();

          // Update last connected timestamp
          await this.updateLastConnectedAt(id);

          return { success: true, message: 'Connection successful' };
        } catch (error) {
          return {
            success: false,
            message: `Failed to connect to local database: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      } else if (connection.type === 's3') {
        if (!connection.s3Bucket || !connection.s3Region) {
          return { success: false, message: 'S3 configuration is incomplete' };
        }

        try {
          // Decrypt credentials
          const accessKey = connection.s3AccessKey ? this.decrypt(connection.s3AccessKey) : undefined;
          const secretKey = connection.s3SecretKey ? this.decrypt(connection.s3SecretKey) : undefined;

          if (!accessKey || !secretKey) {
            return { success: false, message: 'S3 credentials are not configured' };
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
          const db = await lancedb.connect(path, { storageOptions });

          // Try to list tables to verify connection
          await db.tableNames();
          await db.close();

          // Update last connected timestamp
          await this.updateLastConnectedAt(id);

          return { success: true, message: 'Connection successful' };
        } catch (error) {
          return {
            success: false,
            message: `Failed to connect to S3 database: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      return { success: false, message: 'Unknown connection type' };
    } catch (error) {
      console.error('Error testing connection:', error);
      return {
        success: false,
        message: `Error testing connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Update the last connected timestamp
   */
  private async updateLastConnectedAt(id: string): Promise<void> {
    try {
      const table = await this.lanceDb.openTable('connections');
      await table.update(
        { lastConnectedAt: String(Date.now()) },
        { where: `id = '${id}'` }
      );
    } catch (error) {
      console.error('Error updating last connected timestamp:', error);
      // Don't throw - this is a non-critical update
    }
  }

  /**
   * Convert a ConnectionRecord to public info (removing sensitive fields)
   */
  private toPublicInfo(record: ConnectionRecord): ConnectionPublicInfo {
    return {
      id: record.id,
      name: record.name,
      type: record.type,
      localPath: record.localPath,
      s3Bucket: record.s3Bucket,
      s3Region: record.s3Region,
      s3Endpoint: record.s3Endpoint,
      dbUsername: record.dbUsername,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      lastConnectedAt: record.lastConnectedAt,
    };
  }
}

/**
 * Connection Service for Electron Main Process
 * Manages database connections with local file persistence
 */

import { Service, Container } from 'typedi';
import { app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { CredentialService, type S3Config } from './credential.service';
import { LanceDBService } from './lancedb.service';

/**
 * Connection type
 */
export type ConnectionType = 'local' | 's3';

/**
 * Connection data structure
 */
export interface Connection {
  id: string;
  name: string;
  type: ConnectionType;
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3Endpoint?: string;
  s3Prefix?: string;
  hasCredentials: boolean;
  createdAt: number;
  updatedAt: number;
  lastConnectedAt?: number;
}

/**
 * Create connection input
 */
export interface CreateConnectionInput {
  name: string;
  type: ConnectionType;
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  s3Prefix?: string;
}

/**
 * Update connection input
 */
export interface UpdateConnectionInput {
  name?: string;
  type?: ConnectionType;
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  s3Prefix?: string;
}

/**
 * Test connection result
 */
export interface TestConnectionResult {
  success: boolean;
  message: string;
}

/**
 * ConnectionService manages database connections in Electron.
 * Connections are stored in a local JSON file in the app's userData directory.
 */
@Service()
export class ConnectionService {
  private readonly configFile: string;
  private connections: Map<string, Connection> = new Map();
  private initialized = false;
  private credentialService: CredentialService;
  private lanceDBService: LanceDBService;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.configFile = path.join(userDataPath, 'connections.json');
    // Get services from container directly to avoid decorator issues in ESM
    this.credentialService = Container.get(CredentialService);
    this.lanceDBService = Container.get(LanceDBService);
  }

  /**
   * Initialize the service by loading connections from file
   */
  private async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.loadConnections();
    this.initialized = true;
  }

  /**
   * Load connections from the config file
   */
  private async loadConnections(): Promise<void> {
    try {
      if (!fs.existsSync(this.configFile)) {
        this.connections = new Map();
        return;
      }

      const data = await fs.promises.readFile(this.configFile, 'utf-8');
      const connectionsArray = JSON.parse(data) as Connection[];

      this.connections = new Map(
        connectionsArray.map(conn => [conn.id, conn])
      );
    } catch (error) {
      console.error('Failed to load connections:', error);
      this.connections = new Map();
    }
  }

  /**
   * Save connections to the config file
   */
  private async saveConnections(): Promise<void> {
    try {
      const userDataPath = app.getPath('userData');
      if (!fs.existsSync(userDataPath)) {
        await fs.promises.mkdir(userDataPath, { recursive: true });
      }

      const connectionsArray = Array.from(this.connections.values());
      await fs.promises.writeFile(
        this.configFile,
        JSON.stringify(connectionsArray, null, 2),
        'utf-8'
      );
    } catch (error) {
      throw new Error(`Failed to save connections: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate a unique ID for a connection
   */
  private generateId(): string {
    return `conn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Create a new connection
   */
  async createConnection(input: CreateConnectionInput): Promise<Connection> {
    await this.initialize();

    // Validate required fields
    if (!input.name || !input.type) {
      throw new Error('Name and type are required');
    }

    // Validate type-specific fields
    if (input.type === 'local' && !input.localPath) {
      throw new Error('Local path is required for local connections');
    }

    if (input.type === 's3') {
      if (!input.s3Bucket || !input.s3Region) {
        throw new Error('S3 bucket and region are required for S3 connections');
      }
    }

    // Check for duplicate name
    const existingConnection = Array.from(this.connections.values()).find(
      conn => conn.name === input.name
    );
    if (existingConnection) {
      throw new Error(`Connection with name "${input.name}" already exists`);
    }

    const now = Date.now();
    const connection: Connection = {
      id: this.generateId(),
      name: input.name,
      type: input.type,
      localPath: input.localPath,
      s3Bucket: input.s3Bucket,
      s3Region: input.s3Region,
      s3Endpoint: input.s3Endpoint,
      s3Prefix: input.s3Prefix,
      hasCredentials: input.type === 's3' && !!(input.s3AccessKey && input.s3SecretKey),
      createdAt: now,
      updatedAt: now,
    };

    // Save S3 credentials if provided
    if (input.type === 's3' && input.s3Bucket && input.s3AccessKey && input.s3SecretKey) {
      await this.credentialService.saveS3Config({
        name: input.name,
        bucket: input.s3Bucket,
        region: input.s3Region,
        endpoint: input.s3Endpoint,
        prefix: input.s3Prefix,
        awsAccessKeyId: input.s3AccessKey,
        awsSecretAccessKey: input.s3SecretKey,
      });
    }

    this.connections.set(connection.id, connection);
    await this.saveConnections();

    return connection;
  }

  /**
   * Get all connections (without sensitive fields)
   */
  async getAllConnections(): Promise<Connection[]> {
    await this.initialize();

    return Array.from(this.connections.values()).sort(
      (a, b) => b.createdAt - a.createdAt
    );
  }

  /**
   * Get a single connection by ID
   */
  async getConnectionById(id: string): Promise<Connection | null> {
    await this.initialize();

    return this.connections.get(id) || null;
  }

  /**
   * Update a connection
   */
  async updateConnection(id: string, input: UpdateConnectionInput): Promise<Connection | null> {
    await this.initialize();

    const connection = this.connections.get(id);
    if (!connection) {
      return null;
    }

    // Check for duplicate name if name is being changed
    if (input.name && input.name !== connection.name) {
      const existingConnection = Array.from(this.connections.values()).find(
        conn => conn.name === input.name && conn.id !== id
      );
      if (existingConnection) {
        throw new Error(`Connection with name "${input.name}" already exists`);
      }
    }

    // Update fields
    if (input.name !== undefined) connection.name = input.name;
    if (input.type !== undefined) connection.type = input.type;
    if (input.localPath !== undefined) connection.localPath = input.localPath;
    if (input.s3Bucket !== undefined) connection.s3Bucket = input.s3Bucket;
    if (input.s3Region !== undefined) connection.s3Region = input.s3Region;
    if (input.s3Endpoint !== undefined) connection.s3Endpoint = input.s3Endpoint;
    if (input.s3Prefix !== undefined) connection.s3Prefix = input.s3Prefix;

    // Update credentials if provided
    if (connection.type === 's3' && input.s3AccessKey && input.s3SecretKey) {
      await this.credentialService.saveS3Config({
        name: connection.name,
        bucket: connection.s3Bucket || '',
        region: connection.s3Region,
        endpoint: connection.s3Endpoint,
        prefix: connection.s3Prefix,
        awsAccessKeyId: input.s3AccessKey,
        awsSecretAccessKey: input.s3SecretKey,
      });
      connection.hasCredentials = true;
    }

    connection.updatedAt = Date.now();

    await this.saveConnections();

    return connection;
  }

  /**
   * Delete a connection
   */
  async deleteConnection(id: string): Promise<boolean> {
    await this.initialize();

    const connection = this.connections.get(id);
    if (!connection) {
      return false;
    }

    // Delete associated credentials if S3 connection
    if (connection.type === 's3' && connection.s3Bucket) {
      await this.credentialService.deleteS3Config(connection.s3Bucket);
    }

    this.connections.delete(id);
    await this.saveConnections();

    return true;
  }

  /**
   * Test a connection
   */
  async testConnection(id: string): Promise<TestConnectionResult> {
    await this.initialize();

    const connection = this.connections.get(id);
    if (!connection) {
      return {
        success: false,
        message: 'Connection not found',
      };
    }

    try {
      if (connection.type === 'local') {
        if (!connection.localPath) {
          return {
            success: false,
            message: 'Local path is not configured',
          };
        }
        return await this.lanceDBService.testConnection(connection.localPath);
      } else {
        // S3 connection
        if (!connection.s3Bucket) {
          return {
            success: false,
            message: 'S3 bucket is not configured',
          };
        }

        // Load credentials
        const s3Config = await this.credentialService.loadS3Config(connection.s3Bucket);
        if (!s3Config || !s3Config.awsAccessKeyId || !s3Config.awsSecretAccessKey) {
          return {
            success: false,
            message: 'S3 credentials not found',
          };
        }

        const config: S3Config = {
          bucket: connection.s3Bucket,
          region: connection.s3Region || 'us-east-1',
          endpoint: connection.s3Endpoint,
          prefix: connection.s3Prefix,
          awsAccessKeyId: s3Config.awsAccessKeyId,
          awsSecretAccessKey: s3Config.awsSecretAccessKey,
        };

        return await this.lanceDBService.testS3Connection(config);
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Get the full S3 config for a connection (with credentials)
   */
  async getS3Config(connectionId: string): Promise<S3Config | null> {
    await this.initialize();

    const connection = this.connections.get(connectionId);
    if (!connection || connection.type !== 's3' || !connection.s3Bucket) {
      return null;
    }

    const s3Config = await this.credentialService.loadS3Config(connection.s3Bucket);
    if (!s3Config) {
      return null;
    }

    return {
      bucket: connection.s3Bucket,
      region: connection.s3Region || s3Config.region || 'us-east-1',
      endpoint: connection.s3Endpoint || s3Config.endpoint,
      prefix: connection.s3Prefix || s3Config.prefix,
      awsAccessKeyId: s3Config.awsAccessKeyId || '',
      awsSecretAccessKey: s3Config.awsSecretAccessKey || '',
    };
  }
}

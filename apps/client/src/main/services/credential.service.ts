/**
 * Credential Service for Electron Main Process
 * Provides secure storage and retrieval of S3 credentials using Electron's safeStorage API
 */

import { Service } from 'typedi';
import { safeStorage, app } from 'electron';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { S3ConnectionConfig } from '@mancedb/lancedb-core';

/**
 * S3 configuration with credentials for storage
 */
export interface S3Config extends S3ConnectionConfig {
  /** Configuration name/label for display */
  name?: string;
  /** Last used timestamp */
  lastUsed?: Date;
}

/**
 * Encrypted S3 configuration stored on disk
 */
interface EncryptedS3Config {
  /** Configuration name */
  name: string;
  /** S3 bucket name */
  bucket: string;
  /** S3 region */
  region?: string;
  /** Custom S3 endpoint */
  endpoint?: string;
  /** Key prefix/path within the bucket */
  prefix?: string;
  /** Encrypted access key ID */
  encryptedAccessKeyId?: string;
  /** Encrypted secret access key */
  encryptedSecretAccessKey?: string;
  /** Last used timestamp */
  lastUsed?: string;
}

/**
 * CredentialService provides secure storage and retrieval of S3 credentials.
 * It uses Electron's safeStorage API for encryption/decryption and stores
 * encrypted data in the app's userData directory.
 *
 * @example
 * ```typescript
 * const credentialService = Container.get(CredentialService);
 *
 * // Save S3 config with credentials
 * await credentialService.saveS3Config({
 *   name: 'My S3 Bucket',
 *   bucket: 'my-bucket',
 *   region: 'us-east-1',
 *   awsAccessKeyId: 'AKIA...',
 *   awsSecretAccessKey: 'secret...'
 * });
 *
 * // Load S3 config with decrypted credentials
 * const config = await credentialService.loadS3Config('my-bucket');
 * ```
 */
@Service()
export class CredentialService {
  private readonly configDir: string;
  private readonly configFile: string;

  constructor() {
    this.configDir = app.getPath('userData');
    this.configFile = path.join(this.configDir, 's3-configs.json');
  }

  /**
   * Encrypt a credential string using Electron's safeStorage
   *
   * @param credential - The credential string to encrypt
   * @returns Buffer containing the encrypted data
   * @throws Error if encryption fails
   *
   * @example
   * ```typescript
   * const encrypted = credentialService.encryptCredential('my-secret-key');
   * ```
   */
  encryptCredential(credential: string): Buffer {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }

    try {
      return safeStorage.encryptString(credential);
    } catch (error) {
      throw new Error(`Failed to encrypt credential: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Decrypt an encrypted credential using Electron's safeStorage
   *
   * @param encrypted - The encrypted Buffer to decrypt
   * @returns The decrypted credential string
   * @throws Error if decryption fails
   *
   * @example
   * ```typescript
   * const decrypted = credentialService.decryptCredential(encryptedBuffer);
   * ```
   */
  decryptCredential(encrypted: Buffer): string {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption is not available on this system');
    }

    try {
      return safeStorage.decryptString(encrypted);
    } catch (error) {
      throw new Error(`Failed to decrypt credential: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Save S3 configuration with encrypted credentials to local file
   *
   * @param config - The S3 configuration to save
   * @throws Error if saving fails
   *
   * @example
   * ```typescript
   * await credentialService.saveS3Config({
   *   name: 'Production Bucket',
   *   bucket: 'prod-lancedb',
   *   region: 'us-west-2',
   *   awsAccessKeyId: 'AKIA...',
   *   awsSecretAccessKey: 'secret...',
   *   prefix: 'data/v1'
   * });
   * ```
   */
  async saveS3Config(config: S3Config): Promise<void> {
    // Load existing configs
    const configs = await this.loadAllEncryptedConfigs();

    // Create encrypted config object
    const encryptedConfig: EncryptedS3Config = {
      name: config.name || config.bucket,
      bucket: config.bucket,
      region: config.region,
      endpoint: config.endpoint,
      prefix: config.prefix,
      lastUsed: config.lastUsed?.toISOString(),
    };

    // Encrypt credentials if provided
    if (config.awsAccessKeyId) {
      const encrypted = this.encryptCredential(config.awsAccessKeyId);
      encryptedConfig.encryptedAccessKeyId = encrypted.toString('base64');
    }

    if (config.awsSecretAccessKey) {
      const encrypted = this.encryptCredential(config.awsSecretAccessKey);
      encryptedConfig.encryptedSecretAccessKey = encrypted.toString('base64');
    }

    // Update or add the config
    const existingIndex = configs.findIndex(c => c.bucket === config.bucket);
    if (existingIndex >= 0) {
      configs[existingIndex] = encryptedConfig;
    } else {
      configs.push(encryptedConfig);
    }

    // Save to file
    await this.saveAllEncryptedConfigs(configs);
  }

  /**
   * Load S3 configuration with decrypted credentials from local file
   *
   * @param bucket - The bucket name to load configuration for
   * @returns The S3 configuration with decrypted credentials, or null if not found
   * @throws Error if loading or decryption fails
   *
   * @example
   * ```typescript
   * const config = await credentialService.loadS3Config('my-bucket');
   * if (config) {
   *   console.log('Access Key:', config.awsAccessKeyId);
   * }
   * ```
   */
  async loadS3Config(bucket: string): Promise<S3Config | null> {
    const configs = await this.loadAllEncryptedConfigs();
    const encryptedConfig = configs.find(c => c.bucket === bucket);

    if (!encryptedConfig) {
      return null;
    }

    const config: S3Config = {
      name: encryptedConfig.name,
      bucket: encryptedConfig.bucket,
      region: encryptedConfig.region,
      endpoint: encryptedConfig.endpoint,
      prefix: encryptedConfig.prefix,
      lastUsed: encryptedConfig.lastUsed ? new Date(encryptedConfig.lastUsed) : undefined,
    };

    // Decrypt credentials if present
    if (encryptedConfig.encryptedAccessKeyId) {
      const encrypted = Buffer.from(encryptedConfig.encryptedAccessKeyId, 'base64');
      config.awsAccessKeyId = this.decryptCredential(encrypted);
    }

    if (encryptedConfig.encryptedSecretAccessKey) {
      const encrypted = Buffer.from(encryptedConfig.encryptedSecretAccessKey, 'base64');
      config.awsSecretAccessKey = this.decryptCredential(encrypted);
    }

    return config;
  }

  /**
   * Load all saved S3 configurations (without decrypted credentials)
   * Use this for listing configs without exposing credentials
   *
   * @returns Array of S3 configurations without credentials
   */
  async loadAllS3Configs(): Promise<Omit<S3Config, 'awsAccessKeyId' | 'awsSecretAccessKey'>[]> {
    const configs = await this.loadAllEncryptedConfigs();

    return configs.map(config => ({
      name: config.name,
      bucket: config.bucket,
      region: config.region,
      endpoint: config.endpoint,
      prefix: config.prefix,
      lastUsed: config.lastUsed ? new Date(config.lastUsed) : undefined,
    }));
  }

  /**
   * Delete a saved S3 configuration
   *
   * @param bucket - The bucket name to delete configuration for
   * @returns True if deleted, false if not found
   */
  async deleteS3Config(bucket: string): Promise<boolean> {
    const configs = await this.loadAllEncryptedConfigs();
    const initialLength = configs.length;

    const filteredConfigs = configs.filter(c => c.bucket !== bucket);

    if (filteredConfigs.length === initialLength) {
      return false;
    }

    await this.saveAllEncryptedConfigs(filteredConfigs);
    return true;
  }

  /**
   * Check if encryption is available on this system
   *
   * @returns True if encryption is available
   */
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Load all encrypted configurations from file
   */
  private async loadAllEncryptedConfigs(): Promise<EncryptedS3Config[]> {
    try {
      if (!fs.existsSync(this.configFile)) {
        return [];
      }

      const data = await fs.promises.readFile(this.configFile, 'utf-8');
      const configs = JSON.parse(data) as EncryptedS3Config[];
      return Array.isArray(configs) ? configs : [];
    } catch (error) {
      console.error('Failed to load S3 configs:', error);
      return [];
    }
  }

  /**
   * Save all encrypted configurations to file
   */
  private async saveAllEncryptedConfigs(configs: EncryptedS3Config[]): Promise<void> {
    try {
      // Ensure directory exists
      if (!fs.existsSync(this.configDir)) {
        await fs.promises.mkdir(this.configDir, { recursive: true });
      }

      await fs.promises.writeFile(
        this.configFile,
        JSON.stringify(configs, null, 2),
        'utf-8'
      );
    } catch (error) {
      throw new Error(`Failed to save S3 configs: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

export type { S3ConnectionConfig };

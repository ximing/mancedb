/**
 * LanceDB Schema Definitions
 * Explicitly define table schemas using Apache Arrow types
 */

import {
  Schema,
  Field,
  Int32,
  Utf8,
  Timestamp,
  TimeUnit,
} from 'apache-arrow';

/**
 * Table Migrations Metadata schema
 * Stores version information for each table's schema
 * Used by migration system to track which versions have been applied
 */
export const tableMigrationsSchema = new Schema([
  new Field('tableName', new Utf8(), false), // non-nullable unique table name
  new Field('currentVersion', new Int32(), false), // non-nullable current schema version
  new Field('lastMigratedAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable last migration timestamp in milliseconds
]);

/**
 * Type definition for table migration records
 */
export interface TableMigrationRecord {
  tableName: string;
  currentVersion: number;
  lastMigratedAt: number; // timestamp in milliseconds
}

/**
 * Connections table schema
 * Stores database connection configurations for the admin tool
 */
export const connectionsSchema = new Schema([
  new Field('id', new Utf8(), false), // non-nullable unique connection id (uuid)
  new Field('name', new Utf8(), false), // non-nullable connection name
  new Field('type', new Utf8(), false), // non-nullable type: 'local' or 's3'
  new Field('localPath', new Utf8(), true), // nullable local database path
  new Field('s3Bucket', new Utf8(), true), // nullable S3 bucket name
  new Field('s3Region', new Utf8(), true), // nullable S3 region
  new Field('s3AccessKey', new Utf8(), true), // nullable encrypted S3 access key
  new Field('s3SecretKey', new Utf8(), true), // nullable encrypted S3 secret key
  new Field('s3Endpoint', new Utf8(), true), // nullable custom S3 endpoint
  new Field('dbUsername', new Utf8(), true), // nullable database username for auth
  new Field('dbPasswordHash', new Utf8(), true), // nullable bcrypt hashed password
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp
  new Field('updatedAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable update timestamp
  new Field('lastConnectedAt', new Timestamp(TimeUnit.MILLISECOND), true), // nullable last successful connection
]);

/**
 * Type definition for connection records
 */
export interface ConnectionRecord {
  id: string;
  name: string;
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string; // encrypted
  s3SecretKey?: string; // encrypted
  s3Endpoint?: string;
  dbUsername?: string;
  dbPasswordHash?: string; // bcrypt hash
  createdAt: number;
  updatedAt: number;
  lastConnectedAt?: number;
}

/**
 * Query History table schema
 * Stores SQL query execution history
 */
export const queryHistorySchema = new Schema([
  new Field('id', new Utf8(), false), // non-nullable unique query id (uuid)
  new Field('connectionId', new Utf8(), false), // non-nullable reference to connections.id
  new Field('sql', new Utf8(), false), // non-nullable SQL query text
  new Field('executedAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable execution timestamp
  new Field('executionTimeMs', new Int32(), true), // nullable execution time in milliseconds
  new Field('rowCount', new Int32(), true), // nullable number of rows returned
  new Field('error', new Utf8(), true), // nullable error message if query failed
]);

/**
 * Type definition for query history records
 */
export interface QueryHistoryRecord {
  id: string;
  connectionId: string;
  sql: string;
  executedAt: number;
  executionTimeMs?: number;
  rowCount?: number;
  error?: string;
}

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
 * Users table schema
 * Stores user account information with explicit type definitions
 */
export const usersSchema = new Schema([
  new Field('uid', new Utf8(), false), // non-nullable unique user id
  new Field('email', new Utf8(), true), // nullable email
  new Field('phone', new Utf8(), true), // nullable phone
  new Field('password', new Utf8(), false), // non-nullable hashed password
  new Field('salt', new Utf8(), false), // non-nullable password salt
  new Field('nickname', new Utf8(), true), // nullable nickname
  new Field('avatar', new Utf8(), true), // nullable avatar URL
  new Field('status', new Int32(), false), // non-nullable status
  new Field('createdAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable creation timestamp in milliseconds
  new Field('updatedAt', new Timestamp(TimeUnit.MILLISECOND), false), // non-nullable update timestamp in milliseconds
]);

/**
 * Type definitions for records
 */
export interface UserRecord {
  uid: string;
  email?: string;
  phone?: string;
  password: string;
  salt: string;
  nickname?: string;
  avatar?: string;
  status: number;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}

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

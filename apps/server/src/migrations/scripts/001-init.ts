/**
 * Migration v1: Initialize all tables
 * This is the initial schema setup for all core tables
 */

import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';
import { usersSchema } from '../../models/db/schema.js';

/**
 * Helper function to create a table if it doesn't exist
 */
async function createTableIfNotExists(
  connection: Connection,
  tableName: string,
  schema: any
): Promise<void> {
  const tableNames = await connection.tableNames();

  if (!tableNames.includes(tableName)) {
    console.log(`Creating table: ${tableName}`);
    await connection.createEmptyTable(tableName, schema);
    console.log(`Table created: ${tableName}`);
  } else {
    console.log(`Table already exists: ${tableName}`);
  }
}

/**
 * Migration for users table
 */
export const usersTableMigration: Migration = {
  version: 1,
  tableName: 'users',
  description: 'Initialize users table with user account information',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'users', usersSchema);
  },
};

/**
 * Migration v1: Initialize all tables
 * This is the initial schema setup for all core tables
 */

import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';

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
 * Migration for table_migrations metadata table
 * Note: This is a placeholder migration. The table_migrations table
 * is created automatically by the migration system if it doesn't exist.
 */
export const tableMigrationsMigration: Migration = {
  version: 1,
  tableName: 'table_migrations',
  description: 'Initialize table_migrations metadata table',
  up: async (_connection: Connection) => {
    // table_migrations is created automatically by the migration system
    console.log('table_migrations table is managed automatically');
  },
};

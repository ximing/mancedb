/**
 * Migration v3: Create admin tables (connections and query_history)
 * Creates tables for the ManceDB tool
 */

import type { Connection } from '@lancedb/lancedb';
import type { Migration } from '../types.js';
import { connectionsSchema, queryHistorySchema } from '../../models/db/schema.js';

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
 * Migration for connections table
 */
export const connectionsTableMigration: Migration = {
  version: 3,
  tableName: 'connections',
  description: 'Initialize connections table for storing database connection configurations',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'connections', connectionsSchema);
  },
};

/**
 * Migration for query_history table
 */
export const queryHistoryTableMigration: Migration = {
  version: 4,
  tableName: 'query_history',
  description: 'Initialize query_history table for storing SQL query execution history',
  up: async (connection: Connection) => {
    await createTableIfNotExists(connection, 'query_history', queryHistorySchema);
  },
};

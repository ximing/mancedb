/**
 * Migration v2: Create scalar indexes for query optimization
 * Creates BTREE and BITMAP indexes for all tables to optimize query performance
 *
 * Index Strategy:
 * - BTREE indexes: for exact match, range queries, and sorting on indexed fields
 * - BITMAP indexes: for low-cardinality fields (status, flags, modality types)
 * - Single-column indexes: LanceDB doesn't support composite indexes yet
 *
 * This migration creates indexes for all business tables to ensure optimal query performance.
 */

import type { Connection } from '@lancedb/lancedb';
import * as lancedb from '@lancedb/lancedb';
import type { Migration } from '../types.js';

/**
 * Helper function to create a scalar index if it doesn't already exist
 */
async function createIndexIfNotExists(
  table: any,
  columnName: string,
  indexType: 'BTREE' | 'BITMAP' = 'BTREE',
  tableName: string = 'unknown'
): Promise<void> {
  try {
    // Create the appropriate index type using LanceDB API
    const indexConfig = indexType === 'BITMAP' ? { config: lancedb.Index.bitmap() } : { config: lancedb.Index.btree() };

    await table.createIndex(columnName, indexConfig);
    console.log(`Created ${indexType} index on ${tableName}.${columnName}`);
  } catch (error: any) {
    // Index already exists or other error
    if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
      console.debug(`Index already exists on ${tableName}.${columnName}`);
    } else {
      console.warn(`Failed to create index on ${tableName}.${columnName}:`, error.message);
    }
  }
}

/**
 * Create all indexes for a specific table
 */
async function createIndexesForTable(connection: Connection, tableName: string): Promise<void> {
  const table = await connection.openTable(tableName);

  switch (tableName) {
    case 'users':
      // uid: BTREE for exact match queries
      // email, phone: BTREE for login and lookup queries
      // status: BITMAP for low-cardinality filtering
      await createIndexIfNotExists(table, 'uid', 'BTREE', 'users');
      await createIndexIfNotExists(table, 'email', 'BTREE', 'users');
      await createIndexIfNotExists(table, 'phone', 'BTREE', 'users');
      await createIndexIfNotExists(table, 'status', 'BITMAP', 'users');
      break;

    case 'table_migrations':
      // tableName: BTREE for version lookup
      await createIndexIfNotExists(table, 'tableName', 'BTREE', 'table_migrations');
      break;
  }
}

/**
 * Migration for creating indexes on all tables
 */
export const createIndexesMigration: Migration = {
  version: 2,
  tableName: 'indexes',
  description: 'Create scalar indexes (BTREE and BITMAP) for query optimization on all tables',
  up: async (connection: Connection) => {
    try {
      console.log('Starting index creation migration...');

      // List of all tables that need indexes
      const tablesToIndex = ['users', 'table_migrations'];

      // Get existing tables
      const existingTables = await connection.tableNames();

      // Create indexes for each existing table
      for (const tableName of tablesToIndex) {
        if (existingTables.includes(tableName)) {
          console.log(`Creating indexes for table: ${tableName}`);
          await createIndexesForTable(connection, tableName);
        } else {
          console.debug(`Table ${tableName} does not exist, skipping index creation`);
        }
      }

      console.log('Index creation migration completed successfully');
    } catch (error) {
      console.error('Index creation migration failed:', error);
      throw error;
    }
  },
};

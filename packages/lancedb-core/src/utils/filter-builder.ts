/**
 * Filter Builder Utilities
 * Provides functions to build LanceDB filter strings from FilterCondition objects
 */

import type { FilterCondition } from '@mancedb/dto';

/**
 * Build a LanceDB WHERE clause string from filter conditions
 * @param filters - Array of filter conditions
 * @returns Filter string for LanceDB query, or undefined if no filters
 * @example
 * buildWhereClause([{ column: 'name', operator: 'eq', value: 'John' }])
 * // Returns: "name = 'John'"
 */
export function buildWhereClause(filters: FilterCondition[]): string | undefined {
  if (!filters || filters.length === 0) {
    return undefined;
  }

  const conditions = filters.map((filter) => buildSingleFilter(filter)).filter(Boolean);

  if (conditions.length === 0) {
    return undefined;
  }

  return conditions.join(' AND ');
}

/**
 * Build a single filter condition string
 * @param filter - Single filter condition
 * @returns Filter string for this condition, or undefined if invalid
 */
export function buildSingleFilter(filter: FilterCondition): string | undefined {
  const { column, operator, value } = filter;

  // Escape single quotes in column name
  const escapedColumn = column.replace(/'/g, "\\'");

  switch (operator) {
    case 'contains':
      // For text contains, use SQL LIKE with wildcards
      if (typeof value === 'string') {
        const escapedValue = value.replace(/'/g, "\\'").replace(/%/g, '\\%');
        return `${escapedColumn} LIKE '%${escapedValue}%'`;
      }
      return undefined;

    case 'eq':
      if (typeof value === 'string') {
        const escapedValue = value.replace(/'/g, "\\'");
        return `${escapedColumn} = '${escapedValue}'`;
      }
      return `${escapedColumn} = ${value}`;

    case 'gt':
      if (typeof value === 'string') {
        const escapedValue = value.replace(/'/g, "\\'");
        return `${escapedColumn} > '${escapedValue}'`;
      }
      return `${escapedColumn} > ${value}`;

    case 'gte':
      if (typeof value === 'string') {
        const escapedValue = value.replace(/'/g, "\\'");
        return `${escapedColumn} >= '${escapedValue}'`;
      }
      return `${escapedColumn} >= ${value}`;

    case 'lt':
      if (typeof value === 'string') {
        const escapedValue = value.replace(/'/g, "\\'");
        return `${escapedColumn} < '${escapedValue}'`;
      }
      return `${escapedColumn} < ${value}`;

    case 'lte':
      if (typeof value === 'string') {
        const escapedValue = value.replace(/'/g, "\\'");
        return `${escapedColumn} <= '${escapedValue}'`;
      }
      return `${escapedColumn} <= ${value}`;

    default:
      return undefined;
  }
}

/**
 * Build a filter string from filter conditions (alias for buildWhereClause)
 * @param filters - Array of filter conditions
 * @returns Filter string for LanceDB query, or undefined if no filters
 */
export function buildFilterString(filters: FilterCondition[] | undefined): string | undefined {
  return buildWhereClause(filters || []);
}

/**
 * Escape a string value for use in LanceDB filter expressions
 * @param value - String value to escape
 * @returns Escaped string with single quotes properly handled
 */
export function escapeFilterValue(value: string): string {
  return value.replace(/'/g, "\\'");
}

/**
 * Build an ID filter for deleting a single row by ID
 * @param id - Row ID (string or number)
 * @param idColumn - Name of the ID column (default: 'id')
 * @returns Filter string for the ID
 */
export function buildIdFilter(id: string | number, idColumn = 'id'): string {
  if (typeof id === 'string') {
    const escapedId = id.replace(/'/g, "\\'");
    return `${idColumn} = '${escapedId}'`;
  }
  return `${idColumn} = ${id}`;
}

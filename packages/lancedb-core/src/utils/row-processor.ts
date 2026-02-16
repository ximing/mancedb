/**
 * Row Processor Utilities
 * Provides functions to process row data for display, including vector truncation
 */

/**
 * Check if a value is a vector (array of numbers or typed array)
 * Vectors are detected as arrays/typed arrays with numeric elements and length > 10
 * @param value - The value to check
 * @returns True if the value is a vector
 */
export function isVector(value: unknown): boolean {
  if (Array.isArray(value)) {
    // Check if it's an array of numbers (vector)
    return value.length > 0 && typeof value[0] === 'number' && value.length > 10;
  }
  if (value instanceof Float32Array || value instanceof Float64Array) {
    return value.length > 10;
  }
  return false;
}

/**
 * Process a row to truncate vectors and binary data for display
 * This prevents large vectors from cluttering the UI
 * @param row - Raw row data from LanceDB query
 * @returns Processed row with vectors truncated to summaries
 * @example
 * processRow({ id: 1, embedding: [0.1, 0.2, ...384 items], name: 'test' })
 * // Returns: { id: 1, embedding: '[384-dim vector]', name: 'test' }
 */
export function processRow(row: Record<string, unknown>): Record<string, unknown> {
  const processed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(row)) {
    processed[key] = processValue(value);
  }

  return processed;
}

/**
 * Process a single value for display
 * @param value - The value to process
 * @returns Processed value (vectors truncated, dates ISO-formatted, etc.)
 */
export function processValue(value: unknown): unknown {
  if (isVector(value)) {
    // Truncate vector to show dimension summary
    const vector = value as number[] | Float32Array | Float64Array;
    return `[${vector.length}-dim vector]`;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Uint8Array || value instanceof Buffer) {
    // Truncate binary data
    return `[${value.length} bytes]`;
  }

  // Handle nested objects (but not arrays of primitives)
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return processRow(value as Record<string, unknown>);
  }

  // Handle arrays of objects
  if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
    return value.map((item) =>
      typeof item === 'object' && item !== null ? processRow(item as Record<string, unknown>) : item
    );
  }

  return value;
}

/**
 * Process multiple rows for display
 * @param rows - Array of raw row data
 * @returns Array of processed rows
 */
export function processRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => processRow(row));
}

/**
 * Truncate a vector to show first N and last N elements
 * @param vector - The vector array
 * @param maxElements - Maximum total elements to show (default: 6)
 * @returns String representation with truncation
 * @example
 * truncateVector([1, 2, 3, 4, 5, 6, 7, 8], 4)
 * // Returns: "[1, 2, ..., 7, 8]"
 */
export function truncateVector(
  vector: number[] | Float32Array | Float64Array,
  maxElements = 6
): string {
  if (vector.length <= maxElements) {
    return `[${vector.join(', ')}]`;
  }

  const half = Math.floor(maxElements / 2);
  const first = vector.slice(0, half);
  const last = vector.slice(-half);

  return `[${first.join(', ')}, ..., ${last.join(', ')}]`;
}

/**
 * Get vector statistics for display
 * @param vector - The vector array
 * @returns Object with statistics (min, max, mean, dimension)
 */
export function getVectorStats(
  vector: number[] | Float32Array | Float64Array
): { dimension: number; min: number; max: number; mean: number } {
  const dimension = vector.length;
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    min = Math.min(min, val);
    max = Math.max(max, val);
    sum += val;
  }

  return {
    dimension,
    min,
    max,
    mean: sum / dimension,
  };
}

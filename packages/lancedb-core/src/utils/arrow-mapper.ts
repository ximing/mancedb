/**
 * Arrow Type Mapper Utilities
 * Provides functions to map Apache Arrow types to display types
 */

/**
 * Map Arrow type string to a human-readable display type
 * @param arrowType - The Arrow type string from schema.field.type.toString()
 * @returns Human-readable type name
 * @example
 * mapArrowTypeToDisplayType('fixed_size_list<float, 384>')
 * // Returns: 'vector(float32, 384d)'
 */
export function mapArrowTypeToDisplayType(arrowType: string): string {
  // Handle fixed_size_list for vectors
  if (arrowType.startsWith('fixed_size_list')) {
    const match = arrowType.match(/fixed_size_list<([^,]+),\s*(\d+)>/);
    if (match) {
      return `vector(${match[1]}, ${match[2]}d)`;
    }
    return 'vector';
  }

  // Handle list types
  if (arrowType.startsWith('list')) {
    const match = arrowType.match(/list<(.+)>/);
    if (match) {
      return `list<${mapArrowTypeToDisplayType(match[1])}>`;
    }
    return 'list';
  }

  // Handle dictionary type
  if (arrowType.startsWith('dictionary')) {
    return 'string';
  }

  // Handle timestamp types
  if (arrowType.startsWith('timestamp')) {
    return 'timestamp';
  }

  // Handle decimal types
  if (arrowType.startsWith('decimal')) {
    return 'decimal';
  }

  // Handle struct types
  if (arrowType.startsWith('struct')) {
    return 'struct';
  }

  // Handle map types
  if (arrowType.startsWith('map')) {
    return 'map';
  }

  // Handle union types
  if (arrowType.startsWith('union')) {
    return 'union';
  }

  // Basic types mapping
  const typeMap: Record<string, string> = {
    int8: 'int8',
    int16: 'int16',
    int32: 'int32',
    int64: 'int64',
    uint8: 'uint8',
    uint16: 'uint16',
    uint32: 'uint32',
    uint64: 'uint64',
    float: 'float32',
    float16: 'float16',
    float32: 'float32',
    float64: 'float64',
    double: 'float64',
    bool: 'boolean',
    boolean: 'boolean',
    utf8: 'string',
    large_utf8: 'large_string',
    binary: 'binary',
    large_binary: 'large_binary',
    date: 'date',
    date32: 'date32',
    date64: 'date64',
    time: 'time',
    time32: 'time32',
    time64: 'time64',
    interval: 'interval',
    duration: 'duration',
    null: 'null',
  };

  // Extract base type (remove parameters like (unit: Millisecond))
  const baseType = arrowType.split('(')[0].trim().toLowerCase();

  return typeMap[baseType] || arrowType;
}

/**
 * Parse a vector type string to extract element type and dimension
 * @param arrowType - The Arrow type string
 * @returns Object with elementType and dimension, or null if not a vector
 * @example
 * parseVectorType('fixed_size_list<float, 384>')
 * // Returns: { elementType: 'float', dimension: 384 }
 */
export function parseVectorType(arrowType: string): { elementType: string; dimension: number } | null {
  const match = arrowType.match(/fixed_size_list<([^,]+),\s*(\d+)>/);
  if (match) {
    return {
      elementType: match[1].trim(),
      dimension: parseInt(match[2], 10),
    };
  }
  return null;
}

/**
 * Check if an Arrow type represents a vector (fixed-size list)
 * @param arrowType - The Arrow type string
 * @returns True if the type is a vector
 */
export function isVectorType(arrowType: string): boolean {
  return arrowType.startsWith('fixed_size_list');
}

/**
 * Get the byte size estimate for a given display type
 * Used for estimating table sizes
 * @param displayType - The display type string
 * @param vectorDimension - Optional vector dimension for vector types
 * @returns Estimated bytes per value
 */
export function getTypeByteSize(displayType: string, vectorDimension?: number): number {
  if (vectorDimension && displayType.startsWith('vector')) {
    // Vector column: assume float32 (4 bytes) per dimension
    return vectorDimension * 4;
  }

  if (displayType === 'string' || displayType === 'utf8' || displayType === 'binary') {
    // Variable length: estimate average 50 bytes
    return 50;
  }

  if (displayType.startsWith('int') || displayType.startsWith('float')) {
    // Numeric types
    if (displayType.includes('64')) {
      return 8;
    } else if (displayType.includes('32')) {
      return 4;
    } else if (displayType.includes('16')) {
      return 2;
    } else {
      return 4;
    }
  }

  if (displayType === 'boolean' || displayType === 'bool') {
    return 1;
  }

  if (displayType === 'timestamp' || displayType === 'date64') {
    return 8;
  }

  // Default estimate
  return 8;
}

/**
 * Map display type back to Arrow SQL type for CAST expressions
 * @param displayType - The display type
 * @param vectorDimension - Optional vector dimension
 * @returns SQL CAST expression type
 */
export function mapDisplayTypeToArrowSql(displayType: string, vectorDimension?: number): string {
  switch (displayType) {
    case 'int64':
    case 'int':
      return 'BIGINT';
    case 'float64':
    case 'float':
    case 'double':
      return 'DOUBLE';
    case 'string':
    case 'utf8':
      return 'VARCHAR';
    case 'binary':
      return 'VARBINARY';
    case 'vector':
      if (!vectorDimension || vectorDimension <= 0) {
        throw new Error('Vector dimension is required and must be positive');
      }
      return `FixedSizeList<${vectorDimension}, Float32>`;
    default:
      return 'VARCHAR';
  }
}

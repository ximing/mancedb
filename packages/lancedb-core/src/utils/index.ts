/**
 * Utility Functions
 * Shared utilities for LanceDB operations
 */

// Filter Builder
export {
  buildWhereClause,
  buildSingleFilter,
  buildFilterString,
  escapeFilterValue,
  buildIdFilter,
} from './filter-builder.js';

// Arrow Mapper
export {
  mapArrowTypeToDisplayType,
  parseVectorType,
  isVectorType,
  getTypeByteSize,
  mapDisplayTypeToArrowSql,
} from './arrow-mapper.js';

// Row Processor
export {
  isVector,
  processRow,
  processValue,
  processRows,
  truncateVector,
  getVectorStats,
} from './row-processor.js';

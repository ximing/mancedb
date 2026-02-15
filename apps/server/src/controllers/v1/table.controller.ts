import { JsonController, Get, Post, Put, Delete, Param, Req, QueryParam, Authorized, Body } from 'routing-controllers';
import { Service } from 'typedi';
import type { Request } from 'express';
import { TableService, type FilterCondition, type AddColumnOptions } from '../../services/table.service.js';
import type { DeleteTableResult, RenameTableResult } from '../../services/table.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';
import type { ConnectionAuthInfo } from '../../types/express.js';

interface ColumnInfoDto {
  name: string;
  type: string;
  nullable: boolean;
  vectorDimension?: number;
}

interface TableSchemaResponseDto {
  name: string;
  columns: ColumnInfoDto[];
  rowCount: number;
  sizeBytes: number;
}

interface TableDataResponseDto {
  rows: Record<string, unknown>[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface AddColumnRequestDto {
  name: string;
  type: 'int64' | 'float64' | 'string' | 'binary' | 'vector';
  vectorDimension?: number;
}

interface AddColumnResponseDto {
  name: string;
  type: string;
  version: number;
}

interface DropColumnResponseDto {
  name: string;
  version: number;
}

interface RenameTableRequestDto {
  newName: string;
}

interface RenameTableResponseDto {
  oldName: string;
  newName: string;
}

interface DeleteTableResponseDto {
  name: string;
  deleted: boolean;
}

@Service()
@JsonController('/api/v1/tables')
export class TableV1Controller {
  constructor(private tableService: TableService) {}

  /**
   * GET /api/v1/tables/:name/schema
   * Get table schema information
   */
  @Get('/:name/schema')
  @Authorized()
  async getTableSchema(@Param('name') tableName: string, @Req() req: Request) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      const schema = await this.tableService.getTableSchema(connectionId, tableName);

      if (!schema) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, `Table '${tableName}' not found`);
      }

      const response: TableSchemaResponseDto = {
        name: schema.name,
        columns: schema.columns.map((col) => ({
          name: col.name,
          type: col.type,
          nullable: col.nullable,
          vectorDimension: col.vectorDimension,
        })),
        rowCount: schema.rowCount,
        sizeBytes: schema.sizeBytes,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Get table schema error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('not configured') || error.message.includes('incomplete')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
        if (error.message.includes('credentials')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to get table schema');
    }
  }

  /**
   * GET /api/v1/tables/:name/data
   * Get table data with pagination, sorting, and filtering
   */
  @Get('/:name/data')
  @Authorized()
  async getTableData(
    @Param('name') tableName: string,
    @QueryParam('page') pageParam: string,
    @QueryParam('pageSize') pageSizeParam: string,
    @QueryParam('sortColumn') sortColumn: string,
    @QueryParam('sortOrder') sortOrder: 'asc' | 'desc',
    @QueryParam('filters') filtersParam: string,
    @Req() req: Request
  ) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      // Parse and validate pagination parameters
      const page = Math.max(1, parseInt(pageParam || '1', 10));
      const pageSize = Math.min(1000, Math.max(1, parseInt(pageSizeParam || '50', 10)));

      // Validate sort order
      const validSortOrder = sortOrder === 'desc' ? 'desc' : 'asc';

      // Parse filters from JSON string
      let filters: FilterCondition[] | undefined;
      if (filtersParam) {
        try {
          const parsed = JSON.parse(decodeURIComponent(filtersParam));
          if (Array.isArray(parsed)) {
            filters = parsed;
          }
        } catch {
          // Invalid filter JSON, ignore
        }
      }

      const result = await this.tableService.getTableData(connectionId, tableName, {
        page,
        pageSize,
        sortColumn: sortColumn || undefined,
        sortOrder: validSortOrder,
        filters,
      });

      if (!result) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, `Table '${tableName}' not found`);
      }

      const response: TableDataResponseDto = {
        rows: result.rows,
        totalCount: result.totalCount,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: result.totalPages,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Get table data error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('not configured') || error.message.includes('incomplete')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
        if (error.message.includes('credentials')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
        if (error.message.includes('does not exist') || error.message.includes('invalid column')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, error.message);
        }
        if (error.message.includes('filter') || error.message.includes('WHERE')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Invalid filter condition');
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to get table data');
    }
  }

  /**
   * POST /api/v1/tables/:name/columns
   * Add a new column to the table
   */
  @Post('/:name/columns')
  @Authorized()
  async addColumn(
    @Param('name') tableName: string,
    @Body() body: AddColumnRequestDto,
    @Req() req: Request
  ) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      // Validate required fields
      if (!body.name || !body.name.trim()) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Column name is required');
      }

      if (!body.type) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Column type is required');
      }

      // Validate column name format (alphanumeric and underscore only)
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(body.name)) {
        return ResponseUtil.error(
          ErrorCode.PARAMS_ERROR,
          'Column name must start with letter or underscore and contain only letters, numbers, and underscores'
        );
      }

      // Validate vector dimension for vector type
      if (body.type === 'vector') {
        if (!body.vectorDimension || body.vectorDimension <= 0 || body.vectorDimension > 10000) {
          return ResponseUtil.error(
            ErrorCode.PARAMS_ERROR,
            'Vector dimension is required and must be between 1 and 10000'
          );
        }
      }

      const options: AddColumnOptions = {
        name: body.name.trim(),
        type: body.type,
        vectorDimension: body.vectorDimension,
        nullable: true, // LanceDB only supports adding nullable columns
      };

      const result = await this.tableService.addColumn(connectionId, tableName, options);

      const response: AddColumnResponseDto = {
        name: body.name.trim(),
        type: body.type,
        version: result.version,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Add column error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('already exists')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, error.message);
        }
        if (error.message.includes('Vector dimension')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, error.message);
        }
        if (error.message.includes('not configured') || error.message.includes('incomplete')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
        if (error.message.includes('credentials')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to add column');
    }
  }

  /**
   * DELETE /api/v1/tables/:name/columns/:column
   * Delete a column from the table
   */
  @Delete('/:name/columns/:column')
  @Authorized()
  async dropColumn(
    @Param('name') tableName: string,
    @Param('column') columnName: string,
    @Req() req: Request
  ) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      const result = await this.tableService.dropColumn(connectionId, tableName, columnName);

      const response: DropColumnResponseDto = {
        name: columnName,
        version: result.version,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Drop column error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('does not exist')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, error.message);
        }
        if (error.message.includes('not configured') || error.message.includes('incomplete')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
        if (error.message.includes('credentials')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to drop column');
    }
  }

  /**
   * DELETE /api/v1/tables/:name
   * Delete a table from the database
   */
  @Delete('/:name')
  @Authorized()
  async deleteTable(@Param('name') tableName: string, @Req() req: Request) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      const result = await this.tableService.deleteTable(connectionId, tableName);

      const response: DeleteTableResponseDto = {
        name: result.name,
        deleted: result.deleted,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Delete table error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('not configured') || error.message.includes('incomplete')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
        if (error.message.includes('credentials')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to delete table');
    }
  }

  /**
   * PUT /api/v1/tables/:name/rename
   * Rename a table
   */
  @Put('/:name/rename')
  @Authorized()
  async renameTable(
    @Param('name') tableName: string,
    @Body() body: RenameTableRequestDto,
    @Req() req: Request
  ) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      // Validate new name
      if (!body.newName || !body.newName.trim()) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'New table name is required');
      }

      const newName = body.newName.trim();

      // Validate table name format
      if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(newName)) {
        return ResponseUtil.error(
          ErrorCode.PARAMS_ERROR,
          'Table name must start with letter or underscore and contain only letters, numbers, and underscores'
        );
      }

      const result = await this.tableService.renameTable(connectionId, tableName, newName);

      const response: RenameTableResponseDto = {
        oldName: result.oldName,
        newName: result.newName,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Rename table error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('already exists')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, error.message);
        }
        if (error.message.includes('Table name must start with')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, error.message);
        }
        if (error.message.includes('not configured') || error.message.includes('incomplete')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
        if (error.message.includes('credentials')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to rename table');
    }
  }
}

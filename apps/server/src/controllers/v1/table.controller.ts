import { JsonController, Get, Param, Req, Authorized } from 'routing-controllers';
import { Service } from 'typedi';
import type { Request } from 'express';
import { TableService } from '../../services/table.service.js';
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
}

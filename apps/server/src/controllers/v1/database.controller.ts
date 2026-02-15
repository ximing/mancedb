import { JsonController, Get, Req, Authorized } from 'routing-controllers';
import { Service } from 'typedi';
import type { Request } from 'express';
import { DatabaseService } from '../../services/database.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';
import type { ConnectionAuthInfo } from '../../types/express.js';

interface TableListItemDto {
  name: string;
  rowCount: number;
  sizeBytes: number;
}

interface TablesResponseDto {
  tables: TableListItemDto[];
  totalCount: number;
}

interface DatabaseInfoResponseDto {
  name: string;
  type: 'local' | 's3';
  path: string;
  tableCount: number;
  tables: TableListItemDto[];
}

@Service()
@JsonController('/api/v1/database')
export class DatabaseV1Controller {
  constructor(private databaseService: DatabaseService) {}

  /**
   * GET /api/v1/database/tables
   * Get all tables in the database with row counts
   */
  @Get('/tables')
  @Authorized()
  async getTables(@Req() req: Request) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      const tables = await this.databaseService.getTables(connectionId);

      const response: TablesResponseDto = {
        tables: tables.map((table) => ({
          name: table.name,
          rowCount: table.rowCount,
          sizeBytes: table.sizeBytes,
        })),
        totalCount: tables.length,
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Get tables error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('not configured') || error.message.includes('incomplete')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to get tables');
    }
  }

  /**
   * GET /api/v1/database/info
   * Get database information and statistics
   */
  @Get('/info')
  @Authorized()
  async getDatabaseInfo(@Req() req: Request) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      const info = await this.databaseService.getDatabaseInfo(connectionId);

      if (!info) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Connection not found');
      }

      const response: DatabaseInfoResponseDto = {
        name: info.name,
        type: info.type,
        path: info.path,
        tableCount: info.tableCount,
        tables: info.tables.map((table) => ({
          name: table.name,
          rowCount: table.rowCount,
          sizeBytes: table.sizeBytes,
        })),
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Get database info error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
        if (error.message.includes('not configured') || error.message.includes('incomplete')) {
          return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to get database info');
    }
  }
}

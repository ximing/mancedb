import { JsonController, Post, Get, Body, Req, QueryParam, Authorized } from 'routing-controllers';
import { Service } from 'typedi';
import type { Request } from 'express';
import { QueryService } from '../../services/query.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';
import type { ConnectionAuthInfo } from '../../types/express.js';

interface ExecuteQueryRequestDto {
  sql: string;
  limit?: number;
}

interface ExecuteQueryResponseDto {
  rows: Record<string, unknown>[];
  rowCount: number;
  executionTimeMs: number;
}

interface QueryHistoryEntryDto {
  id: string;
  sql: string;
  executedAt: number;
  executionTimeMs?: number;
  rowCount?: number;
  error?: string;
}

interface QueryHistoryResponseDto {
  history: QueryHistoryEntryDto[];
}

@Service()
@JsonController('/api/v1')
export class QueryV1Controller {
  constructor(private queryService: QueryService) {}

  /**
   * POST /api/v1/query
   * Execute a SQL query
   */
  @Post('/query')
  @Authorized()
  async executeQuery(@Body() body: ExecuteQueryRequestDto, @Req() req: Request) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      // Validate request
      if (!body.sql || typeof body.sql !== 'string') {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'SQL query is required');
      }

      const sql = body.sql.trim();
      if (sql.length === 0) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'SQL query cannot be empty');
      }

      // Validate limit
      const limit = body.limit ? Math.min(1000, Math.max(1, body.limit)) : 1000;

      // Execute the query
      let result: ExecuteQueryResponseDto;
      let error: string | undefined;

      try {
        result = await this.queryService.executeQuery(connectionId, {
          sql,
          limit,
        });
      } catch (execError) {
        error = execError instanceof Error ? execError.message : 'Query execution failed';
        // Record failed query to history
        await this.queryService.recordQueryHistory(
          connectionId,
          sql,
          0,
          0,
          error
        );
        return ResponseUtil.error(ErrorCode.DB_ERROR, error);
      }

      // Record successful query to history
      await this.queryService.recordQueryHistory(
        connectionId,
        sql,
        result.executionTimeMs,
        result.rowCount
      );

      return ResponseUtil.success(result);
    } catch (error) {
      console.error('Execute query error:', error);
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
        if (error.message.includes('Only SELECT')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, error.message);
        }
        if (error.message.includes('Invalid SQL')) {
          return ResponseUtil.error(ErrorCode.PARAMS_ERROR, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to execute query');
    }
  }

  /**
   * GET /api/v1/query/history
   * Get query history for the connection
   */
  @Get('/query/history')
  @Authorized()
  async getQueryHistory(
    @QueryParam('limit') limitParam: string,
    @Req() req: Request
  ) {
    try {
      const user = req.user as ConnectionAuthInfo | undefined;
      const connectionId = user?.connectionId;
      if (!connectionId) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, 'Connection authentication required');
      }

      // Parse and validate limit parameter
      const limit = Math.min(100, Math.max(1, parseInt(limitParam || '20', 10)));

      const history = await this.queryService.getQueryHistory(connectionId, limit);

      const response: QueryHistoryResponseDto = {
        history: history.map((entry) => ({
          id: entry.id,
          sql: entry.sql,
          executedAt: entry.executedAt,
          executionTimeMs: entry.executionTimeMs,
          rowCount: entry.rowCount,
          error: entry.error,
        })),
      };

      return ResponseUtil.success(response);
    } catch (error) {
      console.error('Get query history error:', error);
      if (error instanceof Error) {
        if (error.message.includes('not found')) {
          return ResponseUtil.error(ErrorCode.NOT_FOUND, error.message);
        }
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to get query history');
    }
  }
}

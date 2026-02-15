import {
  JsonController,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from 'routing-controllers';
import { Service } from 'typedi';
import { ConnectionService } from '../../services/connection.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';
import type {
  CreateConnectionInput,
  UpdateConnectionInput,
} from '../../services/connection.service.js';

// DTOs for API requests/responses
interface CreateConnectionDto {
  name: string;
  type: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  dbUsername?: string;
  dbPassword?: string;
}

interface UpdateConnectionDto {
  name?: string;
  type?: 'local' | 's3';
  localPath?: string;
  s3Bucket?: string;
  s3Region?: string;
  s3AccessKey?: string;
  s3SecretKey?: string;
  s3Endpoint?: string;
  dbUsername?: string;
  dbPassword?: string;
}

interface TestConnectionResponseDto {
  success: boolean;
  message: string;
}

@Service()
@JsonController('/api/v1/connections')
export class ConnectionV1Controller {
  constructor(private connectionService: ConnectionService) {}

  /**
   * POST /api/v1/connections
   * Create a new connection
   */
  @Post('/')
  async createConnection(@Body() body: CreateConnectionDto) {
    try {
      // Validate required fields
      if (!body.name || !body.type) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Name and type are required');
      }

      // Validate type
      if (body.type !== 'local' && body.type !== 's3') {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Type must be "local" or "s3"');
      }

      // Validate type-specific fields
      if (body.type === 'local' && !body.localPath) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Local path is required for local connections');
      }

      if (body.type === 's3') {
        if (!body.s3Bucket || !body.s3Region) {
          return ResponseUtil.error(
            ErrorCode.PARAMS_ERROR,
            'S3 bucket and region are required for S3 connections'
          );
        }
      }

      const input: CreateConnectionInput = {
        name: body.name,
        type: body.type,
        localPath: body.localPath,
        s3Bucket: body.s3Bucket,
        s3Region: body.s3Region,
        s3AccessKey: body.s3AccessKey,
        s3SecretKey: body.s3SecretKey,
        s3Endpoint: body.s3Endpoint,
        dbUsername: body.dbUsername,
        dbPassword: body.dbPassword,
      };

      const connection = await this.connectionService.createConnection(input);

      // Return public info (without sensitive fields)
      return ResponseUtil.success({
        id: connection.id,
        name: connection.name,
        type: connection.type,
        localPath: connection.localPath,
        s3Bucket: connection.s3Bucket,
        s3Region: connection.s3Region,
        s3Endpoint: connection.s3Endpoint,
        dbUsername: connection.dbUsername,
        createdAt: connection.createdAt,
        updatedAt: connection.updatedAt,
        lastConnectedAt: connection.lastConnectedAt,
      });
    } catch (error) {
      console.error('Create connection error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseUtil.error(ErrorCode.BUSINESS_ERROR, error.message);
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/connections
   * Get all connections (without sensitive fields)
   */
  @Get('/')
  async getAllConnections() {
    try {
      const connections = await this.connectionService.getAllConnections();
      return ResponseUtil.success(connections);
    } catch (error) {
      console.error('Get all connections error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * GET /api/v1/connections/:id
   * Get a single connection by ID
   */
  @Get('/:id')
  async getConnectionById(@Param('id') id: string) {
    try {
      if (!id) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Connection ID is required');
      }

      const connection = await this.connectionService.getConnectionById(id);

      if (!connection) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Connection not found');
      }

      return ResponseUtil.success(connection);
    } catch (error) {
      console.error('Get connection by ID error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * PUT /api/v1/connections/:id
   * Update a connection
   */
  @Put('/:id')
  async updateConnection(@Param('id') id: string, @Body() body: UpdateConnectionDto) {
    try {
      if (!id) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Connection ID is required');
      }

      // Validate type if provided
      if (body.type && body.type !== 'local' && body.type !== 's3') {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Type must be "local" or "s3"');
      }

      const input: UpdateConnectionInput = {
        name: body.name,
        type: body.type,
        localPath: body.localPath,
        s3Bucket: body.s3Bucket,
        s3Region: body.s3Region,
        s3AccessKey: body.s3AccessKey,
        s3SecretKey: body.s3SecretKey,
        s3Endpoint: body.s3Endpoint,
        dbUsername: body.dbUsername,
        dbPassword: body.dbPassword,
      };

      const connection = await this.connectionService.updateConnection(id, input);

      if (!connection) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Connection not found');
      }

      return ResponseUtil.success(connection);
    } catch (error) {
      console.error('Update connection error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseUtil.error(ErrorCode.BUSINESS_ERROR, error.message);
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * DELETE /api/v1/connections/:id
   * Delete a connection
   */
  @Delete('/:id')
  async deleteConnection(@Param('id') id: string) {
    try {
      if (!id) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Connection ID is required');
      }

      const success = await this.connectionService.deleteConnection(id);

      if (!success) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Connection not found');
      }

      return ResponseUtil.success({ deleted: true });
    } catch (error) {
      console.error('Delete connection error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * POST /api/v1/connections/:id/test
   * Test a connection
   */
  @Post('/:id/test')
  async testConnection(@Param('id') id: string) {
    try {
      if (!id) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Connection ID is required');
      }

      const result = await this.connectionService.testConnection(id);

      const response: TestConnectionResponseDto = {
        success: result.success,
        message: result.message,
      };

      if (result.success) {
        return ResponseUtil.success(response);
      } else {
        return ResponseUtil.error(ErrorCode.DB_CONNECT_ERROR, result.message);
      }
    } catch (error) {
      console.error('Test connection error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }
}

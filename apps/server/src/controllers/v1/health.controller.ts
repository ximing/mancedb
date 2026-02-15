import { Controller, Get } from 'routing-controllers';
import { Service } from 'typedi';
import { ResponseUtil } from '../../utils/response.js';
import { LanceDbService } from '../../sources/lancedb.js';
import { Container } from 'typedi';
import { ErrorCode } from '../../constants/error-codes.js';

@Service()
@Controller('/api/v1')
export class HealthV1Controller {
  /**
   * Health check endpoint for Docker/container orchestration
   * Returns 200 OK if the server is running and database is accessible
   */
  @Get('/health')
  async healthCheck() {
    try {
      // Check if LanceDB is accessible
      const lanceDbService = Container.get(LanceDbService);
      const isDbHealthy = await lanceDbService.healthCheck();

      if (!isDbHealthy) {
        return ResponseUtil.error(
          ErrorCode.DB_CONNECT_ERROR,
          'Database connection failed'
        );
      }

      return ResponseUtil.success({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
      });
    } catch (error) {
      console.error('Health check failed:', error);
      return ResponseUtil.error(
        ErrorCode.DB_CONNECT_ERROR,
        'Health check failed'
      );
    }
  }
}

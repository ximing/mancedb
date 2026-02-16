import { JsonController, Get, Put, Body } from 'routing-controllers';
import { Service } from 'typedi';
import { ResponseUtil } from '../../utils/response.js';

/**
 * @deprecated User management has been removed. This controller returns mock responses for compatibility.
 */
@Service()
@JsonController('/api/v1/user')
export class UserV1Controller {
  @Get('/info')
  async getUser() {
    // Authentication removed - return a default user
    return ResponseUtil.success({
      uid: 'anonymous',
      email: 'anonymous@mancedb.local',
      nickname: 'Anonymous',
    });
  }

  @Put('/info')
  async updateUser(@Body() _updateData: Record<string, unknown>) {
    // Authentication removed - user profile updates disabled
    return ResponseUtil.success({
      message: 'User info updated successfully',
      user: {
        uid: 'anonymous',
        email: 'anonymous@mancedb.local',
        nickname: 'Anonymous',
      },
    });
  }
}

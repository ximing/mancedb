import { JsonController, Get, Put, Body } from 'routing-controllers';
import { Service } from 'typedi';
import type { UpdateUserDto } from '@mancedb/dto';
import { ResponseUtil } from '../../utils/response.js';

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
  async updateUser(@Body() _updateData: UpdateUserDto) {
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

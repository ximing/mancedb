import { JsonController, Post, Body } from 'routing-controllers';
import { Service } from 'typedi';
import type { RegisterDto, LoginDto, ConnectionLoginDto, RefreshTokenDto } from '@mancedb/dto';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';

/**
 * @deprecated Authentication has been removed. This controller returns mock responses for compatibility.
 */
@Service()
@JsonController('/api/v1/auth')
export class AuthV1Controller {
  /**
   * @deprecated User registration is disabled
   */
  @Post('/register')
  async register(@Body() _userData: RegisterDto) {
    return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'User registration is disabled');
  }

  /**
   * @deprecated User login is disabled
   */
  @Post('/login')
  async login(@Body() _loginData: LoginDto) {
    return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'User login is disabled');
  }

  /**
   * @deprecated Connection-based authentication is disabled
   */
  @Post('/connections/login')
  async connectionLogin(@Body() _loginData: ConnectionLoginDto) {
    return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Authentication is disabled');
  }

  /**
   * @deprecated Token refresh is disabled
   */
  @Post('/connections/refresh')
  async refreshConnectionToken(@Body() _refreshData: RefreshTokenDto) {
    return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Token refresh is disabled');
  }
}

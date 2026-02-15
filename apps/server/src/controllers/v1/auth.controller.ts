import { JsonController, Post, Body, Res } from 'routing-controllers';
import { Service } from 'typedi';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import type { RegisterDto, LoginDto, ConnectionLoginDto, RefreshTokenDto } from '@mancedb/dto';
import { UserService } from '../../services/user.service.js';
import { ConnectionService } from '../../services/connection.service.js';
import { ConnectionAuthService } from '../../services/connection-auth.service.js';
import { ResponseUtil } from '../../utils/response.js';
import { ErrorCode } from '../../constants/error-codes.js';
import { config } from '../../config/config.js';

@Service()
@JsonController('/api/v1/auth')
export class AuthV1Controller {
  constructor(
    private userService: UserService,
    private connectionService: ConnectionService,
    private connectionAuthService: ConnectionAuthService
  ) {}

  @Post('/register')
  async register(@Body() userData: RegisterDto) {
    try {
      if (!userData.email || !userData.password) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Email and password are required');
      }

      // Hash password
      const { hashedPassword, salt } = await this.userService.hashPassword(userData.password);

      // Create new user
      const user = await this.userService.createUser({
        uid: '', // Will be generated in service
        email: userData.email,
        password: hashedPassword,
        salt,
        nickname: userData.nickname,
        phone: userData.phone,
        status: 1,
      });

      return ResponseUtil.success({
        user: {
          uid: user.uid,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } catch (error) {
      console.error('Registration error:', error);
      if (error instanceof Error && error.message.includes('already exists')) {
        return ResponseUtil.error(ErrorCode.USER_ALREADY_EXISTS);
      }
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  @Post('/login')
  async login(@Body() loginData: LoginDto, @Res() response: Response) {
    try {
      if (!loginData.email || !loginData.password) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Email and password are required');
      }

      // Find user by email
      const user = await this.userService.findUserByEmail(loginData.email);
      if (!user) {
        return ResponseUtil.error(ErrorCode.USER_NOT_FOUND);
      }

      // Verify password
      const isPasswordValid = await this.userService.verifyPassword(
        loginData.password,
        user.password
      );
      if (!isPasswordValid) {
        return ResponseUtil.error(ErrorCode.PASSWORD_ERROR);
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          uid: user.uid,
        },
        config.jwt.secret,
        { expiresIn: '90d' }
      );

      // Set cookie with token
      response.cookie('mancedb_token', token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 90 * 24 * 60 * 60 * 1000, // 90 days in milliseconds
      });

      return ResponseUtil.success({
        token,
        user: {
          uid: user.uid,
          email: user.email,
          nickname: user.nickname,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR);
    }
  }

  /**
   * Connection-based login - authenticate against a specific LanceDB connection
   */
  @Post('/connections/login')
  async connectionLogin(@Body() loginData: ConnectionLoginDto, @Res() response: Response) {
    try {
      // Validate input
      if (!loginData.connectionId || !loginData.username || !loginData.password) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Connection ID, username, and password are required');
      }

      // Authenticate against the connection
      const authResult = await this.connectionAuthService.authenticate(
        loginData.connectionId,
        loginData.username,
        loginData.password
      );

      if (!authResult.success) {
        return ResponseUtil.error(ErrorCode.PASSWORD_ERROR, authResult.error || 'Authentication failed');
      }

      // Get connection details for response
      const connection = await this.connectionService.getConnectionById(loginData.connectionId);
      if (!connection) {
        return ResponseUtil.error(ErrorCode.NOT_FOUND, 'Connection not found');
      }

      // Set cookie with token
      response.cookie('mancedb_connection_token', authResult.token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      });

      return ResponseUtil.success({
        token: authResult.token,
        connection: {
          id: connection.id,
          name: connection.name,
          type: connection.type,
        },
        expiresAt: authResult.expiresAt,
      });
    } catch (error) {
      console.error('Connection login error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Authentication failed');
    }
  }

  /**
   * Refresh JWT token for connection-based authentication
   */
  @Post('/connections/refresh')
  async refreshConnectionToken(@Body() refreshData: RefreshTokenDto, @Res() response: Response) {
    try {
      // Get token from body or cookie
      const token = refreshData.token || response.req.cookies?.mancedb_connection_token;

      if (!token) {
        return ResponseUtil.error(ErrorCode.PARAMS_ERROR, 'Token is required');
      }

      // Refresh the token
      const refreshResult = await this.connectionAuthService.refreshToken(token);

      if (!refreshResult.success) {
        return ResponseUtil.error(ErrorCode.UNAUTHORIZED, refreshResult.error || 'Failed to refresh token');
      }

      // Update cookie with new token
      response.cookie('mancedb_connection_token', refreshResult.token, {
        httpOnly: true,
        secure: config.env === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
      });

      return ResponseUtil.success({
        token: refreshResult.token,
        expiresAt: refreshResult.expiresAt,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return ResponseUtil.error(ErrorCode.DB_ERROR, 'Failed to refresh token');
    }
  }
}

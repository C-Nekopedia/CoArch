import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Version,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('认证')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用户注册' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '注册成功',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'uuid',
            username: 'john_doe',
            email: 'john@example.com',
            avatar: null,
            bio: null,
            followersCount: 0,
            followingCount: 0,
            articleCount: 0,
            videoCount: 0,
          },
        },
        message: '注册成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '用户名或邮箱已存在',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数验证失败',
  })
  async register(@Body() registerDto: RegisterDto) {
    const result = await this.authService.register(registerDto);
    return {
      success: true,
      data: result,
      message: '注册成功',
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用户登录' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '登录成功',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'uuid',
            username: 'john_doe',
            email: 'john@example.com',
            avatar: null,
            bio: null,
            followersCount: 0,
            followingCount: 0,
            articleCount: 0,
            videoCount: 0,
          },
        },
        message: '登录成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '邮箱或密码错误',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数验证失败',
  })
  async login(@Body() loginDto: LoginDto) {
    const result = await this.authService.login(loginDto);
    return {
      success: true,
      data: result,
      message: '登录成功',
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新访问令牌' })
  @ApiBody({ type: RefreshTokenDto })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '令牌刷新成功',
    schema: {
      example: {
        success: true,
        data: {
          accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          user: {
            id: 'uuid',
            username: 'john_doe',
            email: 'john@example.com',
            avatar: null,
            bio: null,
            followersCount: 0,
            followingCount: 0,
            articleCount: 0,
            videoCount: 0,
          },
        },
        message: '令牌刷新成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '刷新令牌无效或已过期',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数验证失败',
  })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    const result = await this.authService.refreshToken(refreshTokenDto.refreshToken);
    return {
      success: true,
      data: result,
      message: '令牌刷新成功',
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '用户注销' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '注销成功',
    schema: {
      example: {
        success: true,
        data: null,
        message: '注销成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  async logout(@Request() req) {
    await this.authService.logout(req.user.id);
    return {
      success: true,
      data: null,
      message: '注销成功',
    };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前用户信息' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取用户信息成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          username: 'john_doe',
          email: 'john@example.com',
          avatar: null,
          bio: null,
          followersCount: 0,
          followingCount: 0,
          articleCount: 0,
          videoCount: 0,
          createdAt: '2026-03-28T10:30:00.000Z',
          updatedAt: '2026-03-28T10:30:00.000Z',
          lastLoginAt: '2026-03-28T10:30:00.000Z',
        },
        message: '获取用户信息成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  async getProfile(@Request() req) {
    const user = await this.authService.getCurrentUser(req.user.id);
    return {
      success: true,
      data: user,
      message: '获取用户信息成功',
    };
  }
}
import { Injectable, ConflictException, UnauthorizedException, NotFoundException, Inject } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { JwtAuthService, TokenPayload } from './jwt.service';
import { ConfigType } from '@nestjs/config';
import config from '../../config/configuration';

export interface RegisterUserDto {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  bio?: string;
}

export interface LoginUserDto {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string; // 前端期望的字段名，原为 accessToken
  refreshToken: string;
  expiresIn?: number; // 令牌过期时间（秒）
  user: {
    id: string;
    username: string;
    email: string;
    avatar?: string;
    bio?: string;
    followers: number; // 前端期望的字段名
    following: number; // 前端期望的字段名
    articleCount: number;
    videoCount: number;
    createdAt?: string; // ISO字符串格式
    updatedAt?: string; // ISO字符串格式
  };
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtAuthService: JwtAuthService,
    @Inject(config.KEY) private readonly appConfig: ConfigType<typeof config>,
  ) {}

  /**
   * 将时间字符串（如 '15m', '2h', '7d'）转换为秒数
   */
  private parseTimeToSeconds(timeStr: string): number {
    const match = timeStr.match(/^(\d+)\s*([smhd])$/i);
    if (!match) {
      return 15 * 60; // 默认15分钟
    }

    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();

    switch (unit) {
      case 's': return value; // 秒
      case 'm': return value * 60; // 分钟
      case 'h': return value * 60 * 60; // 小时
      case 'd': return value * 24 * 60 * 60; // 天
      default: return value * 60; // 默认按分钟处理
    }
  }

  /**
   * 用户注册
   */
  async register(registerDto: RegisterUserDto): Promise<AuthResponse> {
    const { username, email, password, avatar, bio } = registerDto;

    // 检查用户名是否已存在
    const existingUserByUsername = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existingUserByUsername) {
      throw new ConflictException('用户名已被使用');
    }

    // 检查邮箱是否已存在
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email },
    });
    if (existingUserByEmail) {
      throw new ConflictException('邮箱已被注册');
    }

    // 密码加密
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        avatar,
        bio,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        articleCount: true,
        videoCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 生成令牌
    return this.generateAuthResponse(user);
  }

  /**
   * 用户登录
   */
  async login(loginDto: LoginUserDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        avatar: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        articleCount: true,
        videoCount: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    // 验证用户
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 更新最后登录时间
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 移除密码哈希字段
    const { passwordHash, deletedAt, ...userWithoutSensitiveData } = user;

    // 生成令牌
    return this.generateAuthResponse(userWithoutSensitiveData);
  }

  /**
   * 刷新访问令牌
   */
  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    // 验证刷新令牌
    let payload;
    try {
      payload = this.jwtAuthService.verifyRefreshToken(refreshToken);
    } catch (error) {
      throw new UnauthorizedException('无效的刷新令牌');
    }

    // 检查刷新令牌是否在数据库中且未被撤销
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { id: payload.tokenId },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.revoked || tokenRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('刷新令牌已过期或已被撤销');
    }

    // 检查用户是否存在且未删除
    if (!tokenRecord.user || tokenRecord.user.deletedAt) {
      throw new UnauthorizedException('用户不存在或已被删除');
    }

    // 撤销旧的刷新令牌
    await this.prisma.refreshToken.update({
      where: { id: payload.tokenId },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });

    // 生成新的令牌对
    const { passwordHash, deletedAt, ...userWithoutSensitiveData } = tokenRecord.user;

    return this.generateAuthResponse(userWithoutSensitiveData);
  }

  /**
   * 用户注销
   * 撤销所有刷新令牌
   */
  async logout(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revoked: false,
      },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * 撤销单个刷新令牌
   */
  async revokeRefreshToken(tokenId: string): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        revoked: true,
        revokedAt: new Date(),
      },
    });
  }

  /**
   * 获取当前用户信息
   */
  async getCurrentUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        articleCount: true,
        videoCount: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 生成认证响应
   */
  private async generateAuthResponse(user: any): Promise<AuthResponse> {
    const tokenPayload: TokenPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    // 创建新的刷新令牌记录
    const refreshTokenRecord = await this.prisma.refreshToken.create({
      data: {
        token: uuidv4(), // 这个字段在schema中是必须的，但实际我们用JWT令牌
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
      },
    });

    // 生成令牌
    const accessToken = this.jwtAuthService.generateAccessToken(tokenPayload);
    const refreshToken = this.jwtAuthService.generateRefreshToken(tokenPayload, refreshTokenRecord.id);

    // 更新刷新令牌记录的token字段为实际的JWT令牌
    await this.prisma.refreshToken.update({
      where: { id: refreshTokenRecord.id },
      data: { token: refreshToken },
    });

    // 计算访问令牌过期时间（秒）
    const expiresIn = this.parseTimeToSeconds(this.appConfig.jwt.accessTokenExpiresIn);

    return {
      token: accessToken, // 前端期望的字段名
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        followers: user.followersCount || 0, // 前端期望的字段名
        following: user.followingCount || 0, // 前端期望的字段名
        articleCount: user.articleCount || 0,
        videoCount: user.videoCount || 0,
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: user.updatedAt ? user.updatedAt.toISOString() : new Date().toISOString(),
      },
    };
  }

  /**
   * 验证用户凭证
   */
  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        username: true,
        email: true,
        passwordHash: true,
        avatar: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        articleCount: true,
        videoCount: true,
        deletedAt: true,
      },
    });

    if (user && !user.deletedAt && await bcrypt.compare(password, user.passwordHash)) {
      const { passwordHash, deletedAt, ...result } = user;
      return result;
    }

    return null;
  }
}
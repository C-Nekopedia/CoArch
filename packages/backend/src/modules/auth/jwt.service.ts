import { Injectable, Inject } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigType } from '@nestjs/config';
import config from '../../config/configuration';

export interface TokenPayload {
  sub: string; // 用户ID
  username: string;
  email: string;
}

export interface AccessTokenPayload extends TokenPayload {
  tokenType: 'access';
}

export interface RefreshTokenPayload extends TokenPayload {
  tokenType: 'refresh';
  tokenId: string; // 刷新令牌ID (对应refresh_tokens表记录)
}

@Injectable()
export class JwtAuthService {
  constructor(
    private readonly jwtService: NestJwtService,
    @Inject(config.KEY) private readonly appConfig: ConfigType<typeof config>,
  ) {}

  /**
   * 生成访问令牌 (15分钟有效期)
   */
  generateAccessToken(payload: TokenPayload): string {
    const accessPayload: AccessTokenPayload = {
      ...payload,
      tokenType: 'access',
    };

    return this.jwtService.sign(accessPayload, {
      secret: this.appConfig.jwt.secret,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.appConfig.jwt.accessTokenExpiresIn as any,
    });
  }

  /**
   * 生成刷新令牌 (7天有效期)
   * @param payload 用户信息
   * @param tokenId 刷新令牌在数据库中的ID
   */
  generateRefreshToken(payload: TokenPayload, tokenId: string): string {
    const refreshPayload: RefreshTokenPayload = {
      ...payload,
      tokenType: 'refresh',
      tokenId,
    };

    return this.jwtService.sign(refreshPayload, {
      secret: this.appConfig.jwt.secret,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      expiresIn: this.appConfig.jwt.refreshTokenExpiresIn as any,
    });
  }

  /**
   * 验证并解析JWT令牌
   */
  verifyToken<T extends TokenPayload>(token: string): T {
    try {
      return this.jwtService.verify<T>(token, {
        secret: this.appConfig.jwt.secret,
      });
    } catch {
      throw new Error('无效的令牌');
    }
  }

  /**
   * 验证访问令牌
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    const payload = this.verifyToken<AccessTokenPayload>(token);
    if (payload.tokenType !== 'access') {
      throw new Error('令牌类型错误: 需要访问令牌');
    }
    return payload;
  }

  /**
   * 验证刷新令牌
   */
  verifyRefreshToken(token: string): RefreshTokenPayload {
    const payload = this.verifyToken<RefreshTokenPayload>(token);
    if (payload.tokenType !== 'refresh') {
      throw new Error('令牌类型错误: 需要刷新令牌');
    }
    return payload;
  }

  /**
   * 从令牌中提取用户ID
   */
  getUserIdFromToken(token: string): string {
    const payload = this.verifyToken<TokenPayload>(token);
    return payload.sub;
  }

  /**
   * 从授权头中提取令牌
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    return authHeader.substring(7); // 移除 "Bearer " 前缀
  }
}

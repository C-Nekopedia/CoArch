import { Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigType } from '@nestjs/config';
import config from '../../../config/configuration';
import { PrismaService } from '../../../shared/prisma/prisma.service';
import { AccessTokenPayload } from '../jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(config.KEY) private readonly appConfig: ConfigType<typeof config>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: appConfig.jwt.secret,
    });
  }

  async validate(payload: AccessTokenPayload) {
    // 验证令牌类型
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('令牌类型错误: 需要访问令牌');
    }

    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
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
        deletedAt: true,
      },
    });

    // 检查用户是否存在且未删除
    if (!user || user.deletedAt) {
      throw new UnauthorizedException('用户不存在或已被删除');
    }

    return user;
  }
}

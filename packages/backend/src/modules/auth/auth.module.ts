import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigType } from '@nestjs/config';
import config from '../../config/configuration';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthService } from './jwt.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { PrismaModule } from '../../shared/prisma/prisma.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [config.KEY],
      useFactory: (appConfig: ConfigType<typeof config>) => ({
        secret: appConfig.jwt.secret,
        signOptions: {
          expiresIn: appConfig.jwt.accessTokenExpiresIn as any,
        },
      }),
    }),
    PrismaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthService,
    JwtStrategy,
  ],
  exports: [
    AuthService,
    JwtAuthService,
    JwtStrategy,
    PassportModule,
  ],
})
export class AuthModule {}
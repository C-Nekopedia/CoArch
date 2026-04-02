import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';
import { redisStore } from 'cache-manager-redis-yet';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      useFactory: async (configService: ConfigService<any>) => {
        const redisConfig = configService.get('redis', { infer: true });

        return {
          store: await redisStore({
            socket: {
              host: redisConfig?.host || 'localhost',
              port: redisConfig?.port || 6379,
            },
            password: redisConfig?.password,
            ttl: 60 * 1000, // 默认TTL 60秒
          }),
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [RedisService],
  exports: [CacheModule, RedisService],
})
export class RedisModule {}

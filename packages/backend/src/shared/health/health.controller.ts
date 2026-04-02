import {
  Controller,
  Get,
  Post,
  HttpCode,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { HealthService, HealthCheckResult } from './health.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RedisService, CacheStats } from '../redis/redis.service';

@ApiTags('系统')
@Controller({ path: 'health', version: '1' })
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    @Inject(RedisService) private readonly redisService: RedisService,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '健康检查',
    description: '检查系统各组件健康状况，包括数据库、Redis和内存使用情况',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '系统健康',
    schema: {
      example: {
        status: 'healthy',
        timestamp: '2026-04-01T12:00:00.000Z',
        uptime: 3600,
        checks: {
          database: {
            status: 'healthy',
            latency: 5,
          },
          redis: {
            status: 'healthy',
            latency: 2,
          },
          memory: {
            status: 'healthy',
            used: 102400000,
            total: 524288000,
            percent: 19.53,
          },
        },
        version: '1.0.0',
        environment: 'development',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: '系统不健康',
    schema: {
      example: {
        status: 'unhealthy',
        timestamp: '2026-04-01T12:00:00.000Z',
        uptime: 3600,
        checks: {
          database: {
            status: 'unhealthy',
            latency: 5000,
            error: 'Connection refused',
          },
          redis: {
            status: 'healthy',
            latency: 2,
          },
          memory: {
            status: 'healthy',
            used: 102400000,
            total: 524288000,
            percent: 19.53,
          },
        },
        version: '1.0.0',
        environment: 'development',
      },
    },
  })
  async checkHealth(): Promise<HealthCheckResult> {
    return this.healthService.checkHealth();
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '就绪检查',
    description: '检查系统是否已就绪可以接收流量，比健康检查更严格',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '系统已就绪',
    schema: {
      example: {
        ready: true,
        checks: [
          {
            name: 'database',
            status: 'ready',
            message: '连接正常，延迟: 5ms',
          },
          {
            name: 'redis',
            status: 'ready',
            message: '连接正常，延迟: 2ms',
          },
          {
            name: 'memory',
            status: 'ready',
            message: '使用率: 19.53%',
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: '系统未就绪',
  })
  async checkReady() {
    return this.healthService.checkReady();
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '存活检查',
    description: '简单的存活检查，用于负载均衡器和容器编排系统',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '应用存活',
    schema: {
      example: {
        status: 'alive',
      },
    },
  })
  async checkLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '系统信息',
    description: '获取系统基本信息，如版本、环境、启动时间等',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '系统信息',
    schema: {
      example: {
        version: '1.0.0',
        environment: 'development',
        nodeVersion: process.version,
        platform: process.platform,
        uptime: 3600,
        memory: {
          heapUsed: 102400000,
          heapTotal: 524288000,
          external: 15000000,
          arrayBuffers: 5000000,
        },
        pid: 12345,
      },
    },
  })
  async getInfo() {
    const memoryUsage = process.memoryUsage();

    return {
      version: process.env.npm_package_version,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      uptime: process.uptime(),
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        external: memoryUsage.external,
        arrayBuffers: memoryUsage.arrayBuffers,
      },
      pid: process.pid,
    };
  }

  @Get('cache-stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '缓存统计',
    description: '获取Redis缓存命中率统计信息',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '缓存统计信息',
    schema: {
      example: {
        stats: {
          hits: 150,
          misses: 50,
          sets: 30,
          deletes: 10,
          errors: 2,
          hitRate: 75.0,
          totalOperations: 240,
        },
        detailedStats: [
          {
            prefix: 'article:',
            hits: 100,
            misses: 20,
            total: 120,
            hitRate: 83.33,
          },
          {
            prefix: 'user:',
            hits: 30,
            misses: 15,
            total: 45,
            hitRate: 66.67,
          },
        ],
        memoryUsage: {
          usedMemory: 1024000,
          maxMemory: 104857600,
          memoryFragmentationRatio: 1.2,
        },
        timestamp: '2026-04-01T12:00:00.000Z',
      },
    },
  })
  async getCacheStats() {
    const stats = this.redisService.getStats();
    const detailedStats = this.redisService.getDetailedStats();
    const memoryUsage = await this.redisService.getMemoryUsage();

    return {
      stats,
      detailedStats,
      memoryUsage,
      timestamp: new Date().toISOString(),
    };
  }

  @Post('cache-stats/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: '重置缓存统计',
    description: '重置缓存命中率统计计数器',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '统计已重置',
    schema: {
      example: {
        success: true,
        message: '缓存统计已重置',
        timestamp: '2026-04-01T12:00:00.000Z',
      },
    },
  })
  async resetCacheStats() {
    this.redisService.resetStats();
    return {
      success: true,
      message: '缓存统计已重置',
      timestamp: new Date().toISOString(),
    };
  }
}

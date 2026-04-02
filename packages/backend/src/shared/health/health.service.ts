import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      error?: string;
    };
    memory: {
      status: 'healthy' | 'unhealthy';
      used: number;
      total: number;
      percent: number;
    };
  };
  version?: string;
  environment: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /**
   * 执行完整的健康检查
   */
  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    const environment = process.env.NODE_ENV || 'development';

    // 并行执行所有检查
    const [databaseCheck, redisCheck, memoryCheck] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
    ]);

    const overallStatus =
      databaseCheck.status === 'healthy' &&
      redisCheck.status === 'healthy' &&
      memoryCheck.status === 'healthy'
        ? 'healthy'
        : 'unhealthy';

    return {
      status: overallStatus,
      timestamp,
      uptime: process.uptime(),
      checks: {
        database: databaseCheck,
        redis: redisCheck,
        memory: memoryCheck,
      },
      version: process.env.npm_package_version,
      environment,
    };
  }

  /**
   * 检查数据库连接
   */
  private async checkDatabase(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // 执行简单的查询检查连接
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      this.logger.debug(`数据库连接检查通过，延迟: ${latency}ms`);

      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      this.logger.error(`数据库连接检查失败: ${error.message}`);

      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * 检查Redis连接
   */
  private async checkRedis(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      // 尝试设置和获取一个测试键
      const testKey = 'health:test';
      const testValue = Date.now().toString();

      await this.redis.set(testKey, testValue, 1000); // 1秒过期
      const retrievedValue = await this.redis.get<string>(testKey);

      const latency = Date.now() - startTime;

      if (retrievedValue === testValue) {
        this.logger.debug(`Redis连接检查通过，延迟: ${latency}ms`);

        return {
          status: 'healthy',
          latency,
        };
      } else {
        throw new Error('Redis返回值不匹配');
      }
    } catch (error) {
      this.logger.error(`Redis连接检查失败: ${error.message}`);

      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * 检查内存使用情况
   */
  private checkMemory(): {
    status: 'healthy' | 'unhealthy';
    used: number;
    total: number;
    percent: number;
  } {
    try {
      const memoryUsage = process.memoryUsage();
      const used = memoryUsage.heapUsed;
      const total = memoryUsage.heapTotal;
      const percent = Math.round((used / total) * 100 * 100) / 100;

      // 如果内存使用超过90%，认为不健康
      const status = percent < 90 ? 'healthy' : 'unhealthy';

      if (status === 'unhealthy') {
        this.logger.warn(`内存使用率过高: ${percent}%`);
      }

      return {
        status,
        used,
        total,
        percent,
      };
    } catch (error) {
      this.logger.error(`内存检查失败: ${error.message}`);

      return {
        status: 'unhealthy',
        used: 0,
        total: 0,
        percent: 100,
      };
    }
  }

  /**
   * 检查服务是否就绪（比健康检查更严格）
   */
  async checkReady(): Promise<{
    ready: boolean;
    checks: Array<{
      name: string;
      status: 'ready' | 'not_ready';
      message: string;
    }>;
  }> {
    const checks: Array<{
      name: string;
      status: 'ready' | 'not_ready';
      message: string;
    }> = [];

    // 数据库就绪检查
    try {
      const dbStart = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const dbLatency = Date.now() - dbStart;

      checks.push({
        name: 'database',
        status: 'ready',
        message: `连接正常，延迟: ${dbLatency}ms`,
      });
    } catch (error) {
      checks.push({
        name: 'database',
        status: 'not_ready',
        message: `连接失败: ${error.message}`,
      });
    }

    // Redis就绪检查
    try {
      const redisStart = Date.now();
      const testKey = 'ready:test';
      const testValue = Date.now().toString();

      await this.redis.set(testKey, testValue, 1000);
      const retrievedValue = await this.redis.get<string>(testKey);

      const redisLatency = Date.now() - redisStart;

      if (retrievedValue === testValue) {
        checks.push({
          name: 'redis',
          status: 'ready',
          message: `连接正常，延迟: ${redisLatency}ms`,
        });
      } else {
        checks.push({
          name: 'redis',
          status: 'not_ready',
          message: '返回值不匹配',
        });
      }
    } catch (error) {
      checks.push({
        name: 'redis',
        status: 'not_ready',
        message: `连接失败: ${error.message}`,
      });
    }

    // 内存就绪检查
    const memoryUsage = process.memoryUsage();
    const memoryPercent =
      Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100 * 100) /
      100;
    const memoryStatus = memoryPercent < 95 ? 'ready' : 'not_ready';

    checks.push({
      name: 'memory',
      status: memoryStatus,
      message: `使用率: ${memoryPercent}%`,
    });

    const allReady = checks.every((check) => check.status === 'ready');

    return {
      ready: allReady,
      checks,
    };
  }

  /**
   * 获取简单的健康状态（用于负载均衡器）
   */
  async getLiveness(): Promise<{ status: 'alive' | 'dead' }> {
    try {
      // 快速检查应用是否能够响应
      // 不检查外部依赖，只检查应用本身
      return { status: 'alive' };
    } catch (error) {
      return { status: 'dead' };
    }
  }
}

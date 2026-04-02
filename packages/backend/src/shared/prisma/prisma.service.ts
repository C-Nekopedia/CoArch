import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { LoggerService } from '../logger/logger.service';

// 动态导入PrismaClient以避免模块问题
type PrismaClientType = any;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private _prisma: PrismaClientType;
  private readonly logger: LoggerService;
  private readonly slowQueryThreshold: number; // 慢查询阈值（毫秒）

  constructor(@Optional() @Inject(LoggerService) logger: LoggerService) {
    this.logger = logger;
    if (this.logger) {
      this.logger.setContext('PrismaService');
    }

    // 从环境变量获取慢查询阈值，默认100ms
    this.slowQueryThreshold = parseInt(
      process.env.DB_SLOW_QUERY_THRESHOLD || '100',
      10,
    );

    // 从生成的prisma客户端导入PrismaClient
    const { PrismaClient } = require('../../generated/prisma/client');

    // 创建PostgreSQL适配器
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL环境变量未设置');
    }

    // 简化适配器配置
    const adapter = new PrismaPg({ connectionString });

    this._prisma = new PrismaClient({
      adapter,
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error']
          : ['error'],
      errorFormat: 'pretty',
    });

    // 设置查询事件监听器
    this.setupQueryListeners();
  }

  get client(): PrismaClientType {
    return this._prisma;
  }

  /**
   * 设置查询事件监听器
   */
  private setupQueryListeners(): void {
    // 监听查询事件
    this._prisma.$on('query' as any, async (event: any) => {
      await this.handleQueryEvent(event);
    });

    // 监听错误事件
    this._prisma.$on('error' as any, async (error: any) => {
      if (this.logger) {
        this.logger.error('数据库错误', error);
      } else {
        console.error('数据库错误:', error);
      }
    });

    if (this.logger) {
      this.logger.debug('数据库查询监听器已设置');
    } else {
      console.log('数据库查询监听器已设置');
    }
  }

  /**
   * 处理查询事件
   */
  private async handleQueryEvent(event: any): Promise<void> {
    try {
      const { query, duration, params, timestamp } = event;

      // 解析查询类型（SELECT, INSERT, UPDATE, DELETE）
      const queryType = this.extractQueryType(query);
      const durationMs = duration;

      // 记录慢查询
      if (durationMs > this.slowQueryThreshold) {
        if (this.logger) {
          this.logger.warn('慢查询检测', {
            query,
            duration: `${durationMs}ms`,
            params,
            queryType,
            threshold: `${this.slowQueryThreshold}ms`,
          });
        } else {
          console.warn(`慢查询检测: ${queryType} 查询耗时 ${durationMs}ms (阈值: ${this.slowQueryThreshold}ms)`);
        }

        // 可以在这里触发警报或记录到专门的文件
      }

      // 开发环境记录所有查询
      if (process.env.NODE_ENV === 'development') {
        if (this.logger) {
          this.logger.debug('数据库查询', {
            query,
            duration: `${durationMs}ms`,
            queryType,
          });
        } else {
          console.log(`数据库查询: ${queryType} 耗时 ${durationMs}ms`);
        }
      }

      // 记录性能指标（如果MetricsService可用）
      await this.recordQueryMetrics(queryType, durationMs);
    } catch (error) {
      if (this.logger) {
        this.logger.error('处理查询事件失败', error);
      } else {
        console.error('处理查询事件失败:', error);
      }
    }
  }

  /**
   * 提取查询类型
   */
  private extractQueryType(query: string): string {
    const firstWord = query.trim().split(/\s+/)[0].toUpperCase();
    const queryTypes = [
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'CREATE',
      'ALTER',
      'DROP',
    ];

    if (queryTypes.includes(firstWord)) {
      return firstWord;
    }

    return 'OTHER';
  }

  /**
   * 记录查询性能指标
   */
  private async recordQueryMetrics(
    queryType: string,
    duration: number,
  ): Promise<void> {
    try {
      // 这里可以集成到MetricsService
      // 暂时只记录到日志
      if (duration > 500) {
        if (this.logger) {
          this.logger.warn('长时间查询', {
            queryType,
            duration: `${duration}ms`,
          });
        } else {
          console.warn(`长时间查询: ${queryType} 耗时 ${duration}ms`);
        }
      }
    } catch (error) {
      // 忽略指标记录错误
    }
  }

  /**
   * 获取数据库连接状态
   */
  async checkConnection(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this._prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        connected: true,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  /**
   * 获取查询统计信息
   */
  getQueryStats(): {
    totalQueries: number;
    slowQueries: number;
    averageDuration: number;
  } {
    // 这里可以实现更复杂的统计跟踪
    // 目前返回简单数据
    return {
      totalQueries: 0,
      slowQueries: 0,
      averageDuration: 0,
    };
  }

  async onModuleInit() {
    console.log('PrismaService onModuleInit: 开始连接数据库...');

    // 添加连接超时机制（10秒）
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('数据库连接超时（10秒）')), 10000)
    );

    try {
      await Promise.race([this._prisma.$connect(), timeout]);
      console.log('PrismaService onModuleInit: 数据库连接成功');
      if (this.logger) {
        this.logger.info('Prisma客户端已连接');
      }
    } catch (error) {
      console.error('PrismaService onModuleInit: 数据库连接失败:', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this._prisma.$disconnect();
    if (this.logger) {
      this.logger.info('Prisma客户端已断开连接');
    }
  }

  /**
   * 代理PrismaClient的方法和属性
   */
  get user() {
    return this._prisma.user;
  }

  get article() {
    return this._prisma.article;
  }

  get comment() {
    return this._prisma.comment;
  }

  get userFollow() {
    return this._prisma.userFollow;
  }

  get articleLike() {
    return this._prisma.articleLike;
  }

  get commentLike() {
    return this._prisma.commentLike;
  }

  get refreshToken() {
    return this._prisma.refreshToken;
  }

  /**
   * 软删除扩展
   * 为支持软删除的模型添加过滤条件
   */
  get softDelete() {
    return {
      user: this.user,
      article: this.article,
      comment: this.comment,
    };
  }

  /**
   * 排除软删除的记录
   */
  excludeDeleted<T extends { deletedAt: Date | null }>(
    record: T,
  ): Omit<T, 'deletedAt'> | null {
    if (record.deletedAt) {
      return null;
    }
    const { deletedAt, ...rest } = record;
    return rest;
  }

  /**
   * 批量排除软删除的记录
   */
  excludeDeletedMany<T extends { deletedAt: Date | null }>(
    records: T[],
  ): Array<Omit<T, 'deletedAt'>> {
    return records
      .filter((record) => !record.deletedAt)
      .map((record) => {
        const { deletedAt, ...rest } = record;
        return rest;
      });
  }

  // 代理其他PrismaClient方法
  $transaction(...args: any[]) {
    return this._prisma.$transaction(...args);
  }

  $queryRaw(...args: any[]) {
    return this._prisma.$queryRaw(...args);
  }

  $executeRaw(...args: any[]) {
    return this._prisma.$executeRaw(...args);
  }

  $on(...args: any[]) {
    return this._prisma.$on(...args);
  }
}

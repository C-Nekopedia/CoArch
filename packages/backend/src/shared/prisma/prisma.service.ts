import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';

// 动态导入PrismaClient以避免模块问题
type PrismaClientType = any;

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private _prisma: PrismaClientType;

  constructor() {
    // 从生成的prisma客户端导入PrismaClient
    const { PrismaClient } = require('../../generated/prisma/client');

    // 创建PostgreSQL适配器
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL环境变量未设置');
    }

    const adapter = new PrismaPg({ connectionString });

    this._prisma = new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      errorFormat: 'pretty',
    });
  }

  get client(): PrismaClientType {
    return this._prisma;
  }

  async onModuleInit() {
    await this._prisma.$connect();
    console.log('Prisma客户端已连接');
  }

  async onModuleDestroy() {
    await this._prisma.$disconnect();
    console.log('Prisma客户端已断开连接');
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
  excludeDeleted<T extends { deletedAt: Date | null }>(record: T): Omit<T, 'deletedAt'> | null {
    if (record.deletedAt) {
      return null;
    }
    const { deletedAt, ...rest } = record;
    return rest;
  }

  /**
   * 批量排除软删除的记录
   */
  excludeDeletedMany<T extends { deletedAt: Date | null }>(records: T[]): Array<Omit<T, 'deletedAt'>> {
    return records
      .filter(record => !record.deletedAt)
      .map(record => {
        const { deletedAt, ...rest } = record;
        return rest;
      });
  }

  // 代理其他PrismaClient方法
  $transaction(...args: any[]) {
    return (this._prisma.$transaction as any)(...args);
  }

  $queryRaw(...args: any[]) {
    return (this._prisma.$queryRaw as any)(...args);
  }

  $executeRaw(...args: any[]) {
    return (this._prisma.$executeRaw as any)(...args);
  }

  $on(...args: any[]) {
    return (this._prisma.$on as any)(...args);
  }
}
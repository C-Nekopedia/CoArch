import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
  hitRate: number;
  totalOperations: number;
}

@Injectable()
export class RedisService implements OnModuleInit {
  private readonly logger = new Logger(RedisService.name);

  // 缓存统计
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
    hitRate: 0,
    totalOperations: 0,
  };

  // 用于记录详细统计（按key前缀分组）
  private detailedStats = new Map<
    string,
    { hits: number; misses: number; total: number }
  >();

  // 统计重置间隔（默认1小时）
  private statsResetInterval = 60 * 60 * 1000; // 1小时

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  onModuleInit() {
    // 启动定时重置统计
    this.startStatsResetTimer();
  }

  /**
   * 获取缓存值
   * @param key 缓存键
   * @returns 缓存值或null
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.cacheManager.get<T>(key);
      if (value === undefined) {
        this.recordMiss(key);
        return null;
      }
      // value 可能是 T 或 null（如果显式存储了null）
      if (value === null) {
        this.recordMiss(key);
        return null;
      }
      this.recordHit(key);
      return value;
    } catch (error) {
      this.logger.error(`Redis获取缓存失败 [${key}]: ${error.message}`);
      this.recordError();
      return null;
    }
  }

  /**
   * 设置缓存值
   * @param key 缓存键
   * @param value 缓存值
   * @param ttl 过期时间（毫秒），默认60秒
   */
  async set<T>(key: string, value: T, ttl = 60000): Promise<void> {
    try {
      await this.cacheManager.set(key, value, ttl);
      this.recordSet(key);
    } catch (error) {
      this.logger.error(`Redis设置缓存失败 [${key}]: ${error.message}`);
      this.recordError();
    }
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  async del(key: string): Promise<void> {
    try {
      await this.cacheManager.del(key);
      this.recordDelete(key);
    } catch (error) {
      this.logger.error(`Redis删除缓存失败 [${key}]: ${error.message}`);
      this.recordError();
    }
  }

  /**
   * 清空所有缓存
   */
  async reset(): Promise<void> {
    try {
      // 尝试通过Redis客户端执行flushdb
      const store =
        this.cacheManager.stores && this.cacheManager.stores[0]
          ? (this.cacheManager.stores[0] as any)
          : null;
      if (store?.client?.flushdb) {
        await store.client.flushdb();
        this.logger.log('Redis缓存已清空');
      } else {
        // 如果没有flushdb方法，记录警告
        this.logger.warn('Redis reset方法不可用，无法清空缓存');
      }
    } catch (error) {
      this.logger.error('Redis清空缓存失败:', error.message);
      this.recordError();
    }
  }

  /**
   * 检查缓存是否存在
   * @param key 缓存键
   * @returns 是否存在
   */
  async has(key: string): Promise<boolean> {
    try {
      const value = await this.cacheManager.get(key);
      const exists = value !== undefined && value !== null;

      if (exists) {
        this.recordHit(key);
      } else {
        this.recordMiss(key);
      }

      return exists;
    } catch (error) {
      this.logger.error(`Redis检查缓存失败 [${key}]: ${error.message}`);
      this.recordError();
      return false;
    }
  }

  /**
   * 获取或设置缓存（缓存穿透保护）
   * @param key 缓存键
   * @param fetchFn 数据获取函数
   * @param ttl 过期时间（毫秒）
   * @returns 缓存值或新获取的值
   */
  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl = 60000,
  ): Promise<T> {
    // 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // 缓存未命中，执行获取函数
    const value = await fetchFn();

    // 设置缓存
    if (value !== null && value !== undefined) {
      await this.set(key, value, ttl);
    }

    return value;
  }

  /**
   * 带锁的获取或设置（防止缓存击穿）
   * 注意：需要Redis客户端支持SET NX EX命令
   * @param key 缓存键
   * @param fetchFn 数据获取函数
   * @param ttl 过期时间（毫秒）
   * @param lockTtl 锁的过期时间（毫秒），默认5秒
   * @returns 缓存值或新获取的值
   */
  async getOrSetWithLock<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl = 60000,
    lockTtl = 5000,
  ): Promise<T> {
    const lockKey = `${key}:lock`;

    // 尝试从缓存获取
    const cached = await this.get<T>(key);
    if (cached !== null && cached !== undefined) {
      return cached;
    }

    // 尝试获取锁
    const lockAcquired = await this.acquireLock(lockKey, lockTtl);
    if (!lockAcquired) {
      // 未获取到锁，等待并重试
      await new Promise((resolve) => setTimeout(resolve, 100));
      return this.getOrSetWithLock(key, fetchFn, ttl, lockTtl);
    }

    try {
      // 再次检查缓存（其他进程可能已经设置）
      const cachedAgain = await this.get<T>(key);
      if (cachedAgain !== null && cachedAgain !== undefined) {
        return cachedAgain;
      }

      // 执行获取函数
      const value = await fetchFn();

      // 设置缓存
      if (value !== null && value !== undefined) {
        await this.set(key, value, ttl);
      }

      return value;
    } finally {
      // 释放锁
      await this.releaseLock(lockKey);
    }
  }

  /**
   * 获取分布式锁
   * 使用Redis的SET NX EX命令实现原子性锁获取
   * @param lockKey 锁键
   * @param ttl 锁过期时间（毫秒）
   * @returns 是否获取成功
   */
  private async acquireLock(lockKey: string, ttl: number): Promise<boolean> {
    try {
      // 尝试直接通过cacheManager的store访问Redis客户端
      const store =
        this.cacheManager.stores && this.cacheManager.stores[0]
          ? (this.cacheManager.stores[0] as any)
          : null;
      if (store?.client?.set) {
        const result = await store.client.set(
          lockKey,
          'locked',
          'PX',
          ttl,
          'NX',
        );
        return result === 'OK';
      }

      // 如果无法访问Redis客户端，回退到简单实现
      const existingLock = await this.get(lockKey);
      if (existingLock) {
        return false;
      }

      await this.set(lockKey, 'locked', ttl);
      return true;
    } catch (error) {
      this.logger.error(`Redis获取锁失败 [${lockKey}]: ${error.message}`);
      return false;
    }
  }

  /**
   * 释放分布式锁
   * @param lockKey 锁键
   */
  private async releaseLock(lockKey: string): Promise<void> {
    try {
      const store =
        this.cacheManager.stores && this.cacheManager.stores[0]
          ? (this.cacheManager.stores[0] as any)
          : null;
      if (store?.client?.del) {
        await store.client.del(lockKey);
      } else {
        await this.del(lockKey);
      }
    } catch (error) {
      this.logger.error(`Redis释放锁失败 [${lockKey}]: ${error.message}`);
      this.stats.errors++;
      this.updateHitRate();
    }
  }

  /**
   * 记录缓存命中
   */
  private recordHit(key: string): void {
    this.stats.hits++;
    this.updateHitRate();
    this.recordDetailedStat(key, 'hit');
  }

  /**
   * 记录缓存未命中
   */
  private recordMiss(key: string): void {
    this.stats.misses++;
    this.updateHitRate();
    this.recordDetailedStat(key, 'miss');
  }

  /**
   * 记录缓存设置
   */
  private recordSet(key: string): void {
    this.stats.sets++;
    this.updateHitRate();
  }

  /**
   * 记录缓存删除
   */
  private recordDelete(key: string): void {
    this.stats.deletes++;
    this.updateHitRate();
  }

  /**
   * 记录错误
   */
  private recordError(): void {
    this.stats.errors++;
    this.updateHitRate();
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.totalOperations =
      this.stats.hits +
      this.stats.misses +
      this.stats.sets +
      this.stats.deletes;

    if (total > 0) {
      this.stats.hitRate =
        Math.round((this.stats.hits / total) * 100 * 100) / 100;
    } else {
      this.stats.hitRate = 0;
    }
  }

  /**
   * 记录详细统计（按key前缀）
   */
  private recordDetailedStat(key: string, type: 'hit' | 'miss'): void {
    // 提取key前缀（例如 "article:" 或 "user:"）
    const colonIndex = key.indexOf(':');
    const prefix = colonIndex > 0 ? key.substring(0, colonIndex + 1) : 'other';

    if (!this.detailedStats.has(prefix)) {
      this.detailedStats.set(prefix, { hits: 0, misses: 0, total: 0 });
    }

    const stat = this.detailedStats.get(prefix)!;

    if (type === 'hit') {
      stat.hits++;
    } else {
      stat.misses++;
    }

    stat.total = stat.hits + stat.misses;
  }

  /**
   * 启动统计重置定时器
   */
  private startStatsResetTimer(): void {
    setInterval(() => {
      this.resetStats();
      this.logger.log('缓存统计已重置');
    }, this.statsResetInterval);
  }

  /**
   * 重置统计
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
      hitRate: 0,
      totalOperations: 0,
    };
    this.detailedStats.clear();
    this.logger.debug('缓存统计已重置');
  }

  /**
   * 获取缓存统计
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 获取详细统计
   */
  getDetailedStats(): Array<{
    prefix: string;
    hits: number;
    misses: number;
    total: number;
    hitRate: number;
  }> {
    const result: Array<{
      prefix: string;
      hits: number;
      misses: number;
      total: number;
      hitRate: number;
    }> = [];

    for (const [prefix, stat] of this.detailedStats.entries()) {
      const hitRate =
        stat.total > 0
          ? Math.round((stat.hits / stat.total) * 100 * 100) / 100
          : 0;
      result.push({
        prefix,
        hits: stat.hits,
        misses: stat.misses,
        total: stat.total,
        hitRate,
      });
    }

    // 按总操作数排序
    return result.sort((a, b) => b.total - a.total);
  }

  /**
   * 获取缓存使用情况（按内存）
   * 注意：需要Redis客户端支持INFO命令
   */
  async getMemoryUsage(): Promise<{
    usedMemory: number;
    maxMemory: number;
    memoryFragmentationRatio: number;
  } | null> {
    try {
      const store =
        this.cacheManager.stores && this.cacheManager.stores[0]
          ? (this.cacheManager.stores[0] as any)
          : null;
      if (store?.client?.info) {
        const info = await store.client.info('memory');
        const lines = info.split('\n');

        let usedMemory = 0;
        let maxMemory = 0;
        let memoryFragmentationRatio = 0;

        for (const line of lines) {
          if (line.startsWith('used_memory:')) {
            usedMemory = parseInt(line.split(':')[1], 10);
          } else if (line.startsWith('maxmemory:')) {
            maxMemory = parseInt(line.split(':')[1], 10);
          } else if (line.startsWith('mem_fragmentation_ratio:')) {
            memoryFragmentationRatio = parseFloat(line.split(':')[1]);
          }
        }

        return { usedMemory, maxMemory, memoryFragmentationRatio };
      }
    } catch (error) {
      this.logger.error(`获取Redis内存使用情况失败: ${error.message}`);
    }

    return null;
  }
}

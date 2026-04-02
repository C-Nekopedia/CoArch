import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

export interface MetricsCollector {
  collect(): void;
}

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly register: client.Registry;
  private readonly collectors: MetricsCollector[] = [];

  // HTTP请求指标
  private readonly httpRequestDuration: client.Histogram<string>;
  private readonly httpRequestsTotal: client.Counter<string>;
  private readonly httpRequestErrors: client.Counter<string>;

  // 数据库指标
  private readonly dbQueryDuration: client.Histogram<string>;
  private readonly dbQueriesTotal: client.Counter<string>;
  private readonly dbErrors: client.Counter<string>;

  // 缓存指标
  private readonly cacheHits: client.Counter<string>;
  private readonly cacheMisses: client.Counter<string>;
  private readonly cacheOperations: client.Counter<string>;

  // 系统指标
  private readonly memoryUsage: client.Gauge<string>;
  private readonly cpuUsage: client.Gauge<string>;
  private readonly eventLoopLag: client.Gauge<string>;
  private readonly activeRequests: client.Gauge<string>;

  constructor() {
    // 创建注册表
    this.register = new client.Registry();
    this.register.setDefaultLabels({
      app: 'coarch-backend',
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    });

    // 初始化指标
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP请求处理时间（秒）',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'HTTP请求总数',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestErrors = new client.Counter({
      name: 'http_request_errors_total',
      help: 'HTTP请求错误数',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: '数据库查询时间（秒）',
      labelNames: ['operation', 'model'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
    });

    this.dbQueriesTotal = new client.Counter({
      name: 'db_queries_total',
      help: '数据库查询总数',
      labelNames: ['operation', 'model'],
    });

    this.dbErrors = new client.Counter({
      name: 'db_errors_total',
      help: '数据库错误数',
      labelNames: ['operation', 'model'],
    });

    this.cacheHits = new client.Counter({
      name: 'cache_hits_total',
      help: '缓存命中数',
      labelNames: ['cache_key_prefix'],
    });

    this.cacheMisses = new client.Counter({
      name: 'cache_misses_total',
      help: '缓存未命中数',
      labelNames: ['cache_key_prefix'],
    });

    this.cacheOperations = new client.Counter({
      name: 'cache_operations_total',
      help: '缓存操作总数',
      labelNames: ['operation'],
    });

    this.memoryUsage = new client.Gauge({
      name: 'process_memory_usage_bytes',
      help: '进程内存使用量（字节）',
      labelNames: ['type'], // heapUsed, heapTotal, rss, external
    });

    this.cpuUsage = new client.Gauge({
      name: 'process_cpu_usage_percent',
      help: '进程CPU使用率（百分比）',
    });

    this.eventLoopLag = new client.Gauge({
      name: 'event_loop_lag_seconds',
      help: '事件循环延迟（秒）',
    });

    this.activeRequests = new client.Gauge({
      name: 'active_requests',
      help: '当前活动请求数',
    });

    // 注册所有指标
    this.register.registerMetric(this.httpRequestDuration);
    this.register.registerMetric(this.httpRequestsTotal);
    this.register.registerMetric(this.httpRequestErrors);
    this.register.registerMetric(this.dbQueryDuration);
    this.register.registerMetric(this.dbQueriesTotal);
    this.register.registerMetric(this.dbErrors);
    this.register.registerMetric(this.cacheHits);
    this.register.registerMetric(this.cacheMisses);
    this.register.registerMetric(this.cacheOperations);
    this.register.registerMetric(this.memoryUsage);
    this.register.registerMetric(this.cpuUsage);
    this.register.registerMetric(this.eventLoopLag);
    this.register.registerMetric(this.activeRequests);

    // 收集默认指标（CPU、内存等）
    client.collectDefaultMetrics({ register: this.register });

    // 启动系统指标收集
    this.startSystemMetricsCollection();
  }

  onModuleInit() {
    // 模块初始化时启动
  }

  /**
   * 记录HTTP请求指标
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
  ): void {
    const labels = { method, route, status_code: statusCode.toString() };

    this.httpRequestDuration.observe(labels, duration / 1000); // 转换为秒
    this.httpRequestsTotal.inc(labels);

    if (statusCode >= 400) {
      this.httpRequestErrors.inc(labels);
    }
  }

  /**
   * 记录数据库查询指标
   */
  recordDbQuery(
    operation: string,
    model: string,
    duration: number,
    success: boolean,
  ): void {
    const labels = { operation, model };

    this.dbQueryDuration.observe(labels, duration / 1000); // 转换为秒
    this.dbQueriesTotal.inc(labels);

    if (!success) {
      this.dbErrors.inc(labels);
    }
  }

  /**
   * 记录缓存指标
   */
  recordCacheHit(keyPrefix: string): void {
    this.cacheHits.inc({ cache_key_prefix: keyPrefix });
    this.cacheOperations.inc({ operation: 'hit' });
  }

  recordCacheMiss(keyPrefix: string): void {
    this.cacheMisses.inc({ cache_key_prefix: keyPrefix });
    this.cacheOperations.inc({ operation: 'miss' });
  }

  recordCacheSet(): void {
    this.cacheOperations.inc({ operation: 'set' });
  }

  recordCacheDelete(): void {
    this.cacheOperations.inc({ operation: 'delete' });
  }

  /**
   * 更新活动请求数
   */
  updateActiveRequests(count: number): void {
    this.activeRequests.set(count);
  }

  /**
   * 获取指标数据（Prometheus格式）
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * 获取指标注册表
   */
  getRegistry(): client.Registry {
    return this.register;
  }

  /**
   * 添加自定义指标收集器
   */
  addCollector(collector: MetricsCollector): void {
    this.collectors.push(collector);
  }

  /**
   * 启动系统指标收集
   */
  private startSystemMetricsCollection(): void {
    // 内存使用指标
    setInterval(() => {
      const memory = process.memoryUsage();

      this.memoryUsage.set({ type: 'heapUsed' }, memory.heapUsed);
      this.memoryUsage.set({ type: 'heapTotal' }, memory.heapTotal);
      this.memoryUsage.set({ type: 'rss' }, memory.rss);
      this.memoryUsage.set({ type: 'external' }, memory.external);
    }, 5000); // 每5秒收集一次

    // CPU使用率（简化版）
    const startUsage = process.cpuUsage();
    setInterval(() => {
      const elapsedCpu = process.cpuUsage(startUsage);
      const elapsedTime = 5000; // 5秒间隔
      const cpuPercent =
        (elapsedCpu.user + elapsedCpu.system) / (elapsedTime * 1000); // 转换为百分比

      this.cpuUsage.set(cpuPercent * 100); // 转换为百分比
    }, 5000);

    // 事件循环延迟
    setInterval(() => {
      const start = process.hrtime();
      setImmediate(() => {
        const diff = process.hrtime(start);
        const lag = diff[0] * 1000 + diff[1] / 1e6; // 转换为毫秒

        this.eventLoopLag.set(lag / 1000); // 转换为秒
      });
    }, 1000);
  }
}

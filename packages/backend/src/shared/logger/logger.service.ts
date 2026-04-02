import { Injectable, Inject, Scope } from '@nestjs/common';
import { PARAMS_PROVIDER_TOKEN, PinoLogger } from 'nestjs-pino';
import { Params } from 'nestjs-pino';
import { Request } from 'express';

export interface LogContext {
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class LoggerService {
  private context?: string;

  constructor(
    private readonly logger: PinoLogger,
    @Inject(PARAMS_PROVIDER_TOKEN) private readonly params: Params,
  ) {}

  /**
   * 设置日志上下文
   * @param context 上下文名称
   */
  setContext(context: string): void {
    this.context = context;
  }

  /**
   * 获取当前请求ID（如果存在）
   */
  getRequestId(): string | undefined {
    const store = (this.params as any).store;
    return store?.req?.id;
  }

  /**
   * 获取当前请求对象（如果存在）
   */
  getRequest(): Request | undefined {
    const store = (this.params as any).store;
    return store?.req;
  }

  /**
   * 记录调试级别日志
   * @param message 日志消息
   * @param context 额外上下文
   */
  debug(message: string, context?: LogContext): void {
    this.logger.debug({ ...context, context: this.context }, message);
  }

  /**
   * 记录信息级别日志
   * @param message 日志消息
   * @param context 额外上下文
   */
  info(message: string, context?: LogContext): void {
    this.logger.info({ ...context, context: this.context }, message);
  }

  /**
   * 记录警告级别日志
   * @param message 日志消息
   * @param context 额外上下文
   */
  warn(message: string, context?: LogContext): void {
    this.logger.warn({ ...context, context: this.context }, message);
  }

  /**
   * 记录错误级别日志
   * @param message 日志消息
   * @param error 错误对象
   * @param context 额外上下文
   */
  error(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext = {
      ...context,
      context: this.context,
    };

    if (error) {
      if (error instanceof Error) {
        (errorContext as any).error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        (errorContext as any).error = error;
      }
    }

    this.logger.error(errorContext, message);
  }

  /**
   * 记录致命级别日志
   * @param message 日志消息
   * @param error 错误对象
   * @param context 额外上下文
   */
  fatal(message: string, error?: Error | any, context?: LogContext): void {
    const errorContext = {
      ...context,
      context: this.context,
    };

    if (error) {
      if (error instanceof Error) {
        (errorContext as any).error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else {
        (errorContext as any).error = error;
      }
    }

    this.logger.fatal(errorContext, message);
  }

  /**
   * 记录HTTP请求日志
   * @param req 请求对象
   * @param res 响应对象
   * @param duration 请求处理时长（毫秒）
   */
  logHttpRequest(req: Request, res: any, duration: number): void {
    const context: LogContext = {
      context: 'HTTP',
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    // 根据状态码确定日志级别
    if (res.statusCode >= 500) {
      this.logger.error(context, 'HTTP Request Error');
    } else if (res.statusCode >= 400) {
      this.logger.warn(context, 'HTTP Request Client Error');
    } else {
      this.logger.info(context, 'HTTP Request');
    }
  }

  /**
   * 记录业务操作日志
   * @param operation 操作名称
   * @param userId 用户ID（可选）
   * @param data 操作数据（可选）
   * @param context 额外上下文
   */
  logOperation(
    operation: string,
    userId?: string,
    data?: any,
    context?: LogContext,
  ): void {
    const logContext: LogContext = {
      ...context,
      context: this.context || 'Operation',
      operation,
      userId,
      data,
      timestamp: new Date().toISOString(),
    };

    this.logger.info(logContext, `Operation: ${operation}`);
  }

  /**
   * 记录性能指标
   * @param metric 指标名称
   * @param value 指标值
   * @param unit 单位（可选）
   * @param context 额外上下文
   */
  logMetric(
    metric: string,
    value: number,
    unit?: string,
    context?: LogContext,
  ): void {
    const logContext: LogContext = {
      ...context,
      context: 'Metric',
      metric,
      value,
      unit,
      timestamp: new Date().toISOString(),
    };

    this.logger.info(logContext, `Metric: ${metric}=${value}${unit || ''}`);
  }
}

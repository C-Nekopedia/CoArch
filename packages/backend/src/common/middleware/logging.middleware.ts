import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * 日志中间件
 * 记录HTTP请求和响应信息
 */
@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request, res: Response, next: NextFunction): void {
    // 生成或获取请求ID
    const requestId = (req.headers['x-request-id'] as string) || uuidv4();
    req.id = requestId;

    // 设置响应头中的请求ID
    res.setHeader('X-Request-ID', requestId);

    const startTime = Date.now();
    const { method, originalUrl, ip, headers } = req;

    // 记录请求开始
    this.logger.debug(
      {
        type: 'request_start',
        requestId,
        method,
        url: originalUrl,
        ip,
        userAgent: headers['user-agent'],
        referer: headers.referer,
        contentType: headers['content-type'],
        contentLength: headers['content-length'],
      },
      `→ ${method} ${originalUrl}`,
    );

    // 监听响应完成
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const { statusCode } = res;
      const contentLength = res.get('content-length') || '0';

      // 根据状态码确定日志级别
      const logLevel =
        statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

      const logData = {
        type: 'request_complete',
        requestId,
        method,
        url: originalUrl,
        statusCode,
        duration: `${duration}ms`,
        contentLength,
        ip,
        userAgent: headers['user-agent'],
      };

      // 使用不同的日志级别
      if (logLevel === 'error') {
        this.logger.error(
          logData,
          `← ${method} ${originalUrl} ${statusCode} (${duration}ms)`,
        );
      } else if (logLevel === 'warn') {
        this.logger.warn(
          logData,
          `← ${method} ${originalUrl} ${statusCode} (${duration}ms)`,
        );
      } else {
        this.logger.log(
          logData,
          `← ${method} ${originalUrl} ${statusCode} (${duration}ms)`,
        );
      }
    });

    // 监听响应错误
    res.on('error', (error) => {
      const duration = Date.now() - startTime;
      this.logger.error(
        {
          type: 'request_error',
          requestId,
          method,
          url: originalUrl,
          duration: `${duration}ms`,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
        },
        `✗ ${method} ${originalUrl} - ${error.message}`,
      );
    });

    next();
  }
}

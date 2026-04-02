import { Module, Global } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import type { AllConfig } from '../../config/configuration';

import { LoggerService } from './logger.service';

@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (configService: ConfigService<AllConfig>) => {
        const nodeEnv =
          configService.get('app.nodeEnv', { infer: true }) || 'development';
        const isProduction = nodeEnv === 'production';

        return {
          pinoHttp: {
            // 基本配置
            level: isProduction ? 'info' : 'debug',
            // 美化输出（仅开发环境）
            transport: !isProduction
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    levelFirst: true,
                    translateTime: 'SYS:standard',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            // 自定义日志格式
            formatters: {
              level: (label: string) => ({ level: label.toUpperCase() }),
            },
            // 自定义属性
            customProps: () => ({
              context: 'HTTP',
            }),
            // 序列化选项
            serializers: {
              req: (req) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
              }),
              res: (res) => ({
                statusCode: res.statusCode,
              }),
              err: (err) => ({
                type: err.type,
                message: err.message,
                stack: err.stack,
              }),
            },
            // 启用请求ID
            genReqId: (req) =>
              req.id ||
              Date.now().toString(36) + Math.random().toString(36).substr(2),
            // 自定义日志级别
            customLogLevel: (req, res, err) => {
              if (res.statusCode >= 500 || err) return 'error';
              if (res.statusCode >= 400) return 'warn';
              return 'info';
            },
            // 自动记录请求和响应
            autoLogging: true,
            // 忽略特定路径
            autoLoggingIgnorePaths: ['/health', '/metrics'],
            // 自定义接收器（可用于发送到外部服务）
            // stream: isProduction ? pino.destination('/var/log/app.log') : undefined,
          },
        };
      },
    }),
  ],
  providers: [LoggerService],
  exports: [PinoLoggerModule, LoggerService],
})
export class LoggerModule {}

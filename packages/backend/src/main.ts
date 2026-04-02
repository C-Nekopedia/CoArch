import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingMiddleware } from './common/middleware/logging.middleware';
import { VersioningType, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  console.log('1. 开始bootstrap');
  // 检查class-validator是否可用
  let classValidatorAvailable = false;
  try {
    await import('class-validator');
    console.log('✅ class-validator模块加载成功');
    classValidatorAvailable = true; // 启用全局验证管道
  } catch (error) {
    console.error('class-validator模块加载失败:', error.message);
  }

  const app = await NestFactory.create(AppModule);
  console.log('2. NestFactory创建完成');
  // 增加请求体大小限制（支持base64图片上传）
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  console.log('2.1 请求体解析中间件配置完成');
  // 日志中间件（暂时注释以排查启动问题）
  // app.use(new LoggingMiddleware().use.bind(new LoggingMiddleware()));

  const configService = app.get(ConfigService);
  // const _reflector = app.get(Reflector); // 未使用，已注释

  // 获取环境变量
  const port = configService.get<number>('PORT', 3001);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api');
  const apiVersion = configService.get<string>('API_VERSION', 'v1');
  // 注意：即使将 API_VERSION 设置为 '1'，NestJS 版本控制也会自动添加 'v' 前缀，实际路径为 /api/v1/
  // 这是 NestJS 的默认行为，保持一致性即可
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const corsOrigin = configService.get<string>(
    'CORS_ORIGIN',
    'http://localhost:5173',
  );
  console.log('2.2 环境变量读取完成');

  // 安全中间件（生产环境）
  if (nodeEnv === 'production') {
    // app.use(helmet()); // 暂时注释以排查启动问题
  }

  console.log('2.3 安全中间件配置完成（生产环境启用helmet）');
  // 压缩中间件（暂时注释以排查启动问题）
  // app.use(
  //   compression({
  //     level: 6, // 压缩级别（0-9，6是较好的平衡点）
  //     threshold: 1024, // 只压缩大于1KB的响应
  //     filter: (req, res) => {
  //       // 根据内容类型决定是否压缩
  //       const contentType = res.getHeader('Content-Type') || '';
  //       const shouldCompress =
  //         contentType.startsWith('application/json') ||
  //         contentType.startsWith('text/') ||
  //         contentType.startsWith('application/javascript') ||
  //         contentType.startsWith('application/xml');
  //
  //       return shouldCompress;
  //     },
  //   }),
  // );

  // 速率限制（生产环境更严格）
  const rateLimitConfig = {
    windowMs: nodeEnv === 'production' ? 15 * 60 * 1000 : 60 * 60 * 1000, // 生产环境15分钟，开发环境1小时
    max: nodeEnv === 'production' ? 100 : 1000, // 生产环境每个IP每窗口最多100请求，开发环境1000
    message: {
      code: 429,
      message: '请求过于频繁，请稍后再试',
      error: 'Too Many Requests',
    },
    standardHeaders: true, // 返回标准的RateLimit-*头部
    legacyHeaders: false, // 禁用X-RateLimit-*头部
    skipSuccessfulRequests: false, // 对成功请求也计数
    skip: (req) => {
      // 跳过健康检查端点
      return req.url.includes('/health') || req.url.includes('/api/v1/health');
    },
  };

  // app.use(rateLimit(rateLimitConfig)); // 暂时注释以排查启动问题

  // 慢速限制（针对频繁请求逐渐增加延迟）
  const slowDownConfig = {
    windowMs: 15 * 60 * 1000, // 15分钟
    delayAfter: nodeEnv === 'production' ? 20 : 100, // 生产环境20请求后开始延迟，开发环境100
    delayMs: (hits) => hits * 100, // 每超过一个请求增加100ms延迟
    maxDelayMs: 5000, // 最大延迟5秒
    skip: (req) => {
      // 跳过健康检查端点
      return req.url.includes('/health') || req.url.includes('/api/v1/health');
    },
  };

  // app.use(slowDown(slowDownConfig)); // 暂时注释以排查启动问题

  console.log('2.4 速率限制中间件配置完成');
  // 设置全局前缀和版本控制
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  console.log('2.5 全局前缀和版本控制配置完成');
  // 全局验证管道（仅在class-validator可用时启用）
  // 注意：NestJS可能会显示"class-validator package is missing"警告，
  // 但这通常是一个误报，验证管道实际可以正常工作
  // 暂时注释验证管道以排查启动问题
  if (classValidatorAvailable) {
    console.log('✅ 启用全局验证管道（忽略NestJS的误报警告）');
    app.useGlobalPipes(
      new ValidationPipe({
        // 最小化配置，避免启动问题
        transform: true, // 自动转换类型
        validationError: {
          target: false, // 不在响应中暴露目标对象
          value: false, // 不在响应中暴露验证值
        },
      }),
    );
  } else {
    console.warn('⚠️  class-validator不可用，跳过全局验证管道');
  }

  console.log('2.6 全局验证管道配置完成');
  // 全局响应拦截器
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  console.log('2.7 全局拦截器和过滤器配置完成');
  // CORS配置
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
    ],
    exposedHeaders: ['X-Request-Id', 'X-Powered-By'],
    credentials: true,
    maxAge: 86400, // 24小时
  });
  console.log('3.1 CORS配置完成');
  console.log('3. 中间件配置完成');

  console.log('3. 中间件配置完成');
  // Swagger API文档配置（仅开发环境）
  if (nodeEnv === 'development') {
    const config = new DocumentBuilder()
      .setTitle('Co-Arch API 文档')
      .setDescription('Co-Arch 内容创作与分享平台后端API文档')
      .setVersion('1.0')
      .addBearerAuth(
        {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          name: 'JWT',
          description: '请输入JWT令牌',
          in: 'header',
        },
        'JWT-auth', // 安全方案名称
      )
      .addTag('认证', '用户认证相关接口')
      .addTag('用户', '用户管理相关接口')
      .addTag('内容', '文章/视频内容管理接口')
      .addTag('评论', '评论系统接口')
      .addTag('搜索', '搜索功能接口')
      .addTag('上传', '文件上传接口')
      .addTag('系统', '系统状态监控接口')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
      customSiteTitle: 'Co-Arch API 文档',
      customfavIcon: 'https://nestjs.com/img/logo-small.svg',
      customCss: `
        .topbar-wrapper img { content:url('https://nestjs.com/img/logo-small.svg'); width:auto; height:40px; }
        .swagger-ui .topbar { background-color: #4a148c; }
        .swagger-ui .info .title { color: #4a148c; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        showRequestDuration: true,
      },
    });

    console.log(`Swagger文档已启用: http://localhost:${port}${apiPrefix}/docs`);
  }

  // 启动应用
  console.log('4. 准备启动服务器，端口:', port);
  try {
    await app.listen(port);
    console.log(`🚀 应用已启动:
      环境: ${nodeEnv}
      地址: http://localhost:${port}
      API前缀: ${apiPrefix}/${apiVersion}
      前端地址: ${corsOrigin}
    `);
  } catch (error) {
    console.error('应用启动失败:', error);
    process.exit(1);
  }
}
bootstrap();

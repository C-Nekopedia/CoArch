import { NestFactory, Reflector } from '@nestjs/core';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // 增加请求体大小限制（支持base64图片上传）
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ extended: true, limit: '10mb' }));
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // 获取环境变量
  const port = configService.get<number>('PORT', 3000);
  const apiPrefix = configService.get<string>('API_PREFIX', '/api');
  const apiVersion = configService.get<string>('API_VERSION', 'v1');
  // 注意：即使将 API_VERSION 设置为 '1'，NestJS 版本控制也会自动添加 'v' 前缀，实际路径为 /api/v1/
  // 这是 NestJS 的默认行为，保持一致性即可
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const corsOrigin = configService.get<string>('CORS_ORIGIN', 'http://localhost:5174');

  // 设置全局前缀和版本控制
  app.setGlobalPrefix(apiPrefix);
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // 自动过滤掉没有装饰器的属性
      forbidNonWhitelisted: true, // 禁止非白名单属性，返回错误
      transform: true, // 自动转换类型
      transformOptions: {
        enableImplicitConversion: true, // 启用隐式转换
      },
      validationError: {
        target: false, // 不在响应中暴露目标对象
        value: false, // 不在响应中暴露验证值
      },
    }),
  );

  // 全局响应拦截器
  app.useGlobalInterceptors(new ResponseInterceptor());

  // 全局异常过滤器
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  // CORS配置
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['X-Request-Id', 'X-Powered-By'],
    credentials: true,
    maxAge: 86400, // 24小时
  });

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
  await app.listen(port);

  console.log(`🚀 应用已启动:
   环境: ${nodeEnv}
   地址: http://localhost:${port}
   API前缀: ${apiPrefix}/${apiVersion}
   前端地址: ${corsOrigin}
  `);
}
bootstrap();

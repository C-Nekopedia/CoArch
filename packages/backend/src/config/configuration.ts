import { registerAs } from '@nestjs/config';

/**
 * 应用配置
 */
export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  apiVersion: string;
  corsOrigin: string;
}

/**
 * 数据库配置
 */
export interface DatabaseConfig {
  url: string;
}

/**
 * JWT配置
 */
export interface JwtConfig {
  secret: string;
  accessTokenExpiresIn: string;
  refreshTokenExpiresIn: string;
}

/**
 * Redis配置
 */
export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
}

/**
 * 文件上传配置
 */
export interface UploadConfig {
  path: string;
  maxFileSize: string;
  allowedImageTypes: string[];
  allowedVideoTypes: string[];
}

/**
 * 速率限制配置
 */
export interface ThrottleConfig {
  ttl: number;
  limit: number;
}

/**
 * 完整配置接口
 */
export interface AllConfig {
  app: AppConfig;
  database: DatabaseConfig;
  jwt: JwtConfig;
  redis: RedisConfig;
  upload: UploadConfig;
  throttle: ThrottleConfig;
}

/**
 * 配置验证函数（实际项目中应使用更严格的验证）
 */
function validateConfig(config: Record<string, any>): void {
  const requiredEnvVars = [
    'DATABASE_URL',
    'JWT_SECRET',
  ];

  const missing = requiredEnvVars.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`缺少必需的环境变量: ${missing.join(', ')}`);
  }

  // 验证端口号
  const port = parseInt(process.env.PORT || '3000', 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`无效的端口号: ${process.env.PORT}`);
  }
}

export default registerAs('config', (): AllConfig => {
  validateConfig(process.env);

  // 解析文件大小字符串（如 '10MB'）为字节数
  const parseFileSize = (sizeStr: string): number => {
    const units = {
      B: 1,
      KB: 1024,
      MB: 1024 * 1024,
      GB: 1024 * 1024 * 1024,
    };

    const match = sizeStr.match(/^(\d+(\.\d+)?)\s*(B|KB|MB|GB)$/i);
    if (!match) {
      return 10 * 1024 * 1024; // 默认10MB
    }

    const value = parseFloat(match[1]);
    const unit = match[3].toUpperCase();
    return value * (units[unit as keyof typeof units] || 1);
  };

  // 解析逗号分隔的字符串为数组
  const parseCommaSeparated = (str: string): string[] => {
    return str.split(',').map(s => s.trim()).filter(Boolean);
  };

  return {
    app: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: parseInt(process.env.PORT || '3000', 10),
      apiPrefix: process.env.API_PREFIX || '/api',
      apiVersion: process.env.API_VERSION || 'v1',
      corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5174',
    },
    database: {
      url: process.env.DATABASE_URL!,
    },
    jwt: {
      secret: process.env.JWT_SECRET!,
      accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRES_IN || '15m',
      refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || '7d',
    },
    redis: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
      password: process.env.REDIS_PASSWORD,
    },
    upload: {
      path: process.env.UPLOAD_PATH || './uploads',
      maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
      allowedImageTypes: parseCommaSeparated(process.env.ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp'),
      allowedVideoTypes: parseCommaSeparated(process.env.ALLOWED_VIDEO_TYPES || 'video/mp4,video/webm'),
    },
    throttle: {
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10),
      limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    },
  };
});
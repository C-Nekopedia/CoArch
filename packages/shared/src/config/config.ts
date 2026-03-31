/**
 * 通用配置定义
 */

/**
 * 应用基础配置
 */
export interface AppConfig {
  version: string;
  name: string;
  environment: 'development' | 'production' | 'test';
}

/**
 * 默认配置
 */
export const defaultConfig: AppConfig = {
  version: '1.0.0',
  name: 'CoArch',
  environment: 'development',
};
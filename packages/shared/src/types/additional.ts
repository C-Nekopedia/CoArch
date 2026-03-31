/**
 * 其他类型定义（搜索、文件上传、系统状态等）
 */

import type { PaginationParams } from './api';
import type { ContentType } from './article';
import type { Article } from './article';
import type { User } from './user';

/**
 * 搜索请求参数
 */
export interface SearchRequest extends PaginationParams {
  q: string; // 搜索关键词
  type?: ContentType | 'user' | 'all'; // 搜索类型
  category?: string; // 分类筛选
  tag?: string;      // 标签筛选
  sortBy?: 'relevance' | 'date' | 'views' | 'likes';
}

/**
 * 搜索结果
 */
export interface SearchResult {
  articles: Article[];
  users: User[];
  total: number;
}

/**
 * 文件上传请求参数
 */
export interface UploadFileRequest {
  file: File;
  type: 'image' | 'video' | 'other';
  folder?: string; // 存储目录
}

/**
 * 文件上传响应
 */
export interface UploadFileResponse {
  url: string;
  filename: string;
  size: number;
  mimeType: string;
}

/**
 * 系统状态信息
 */
export interface SystemStatus {
  version: string;
  uptime: number;
  totalUsers: number;
  totalArticles: number;
  totalVideos: number;
  onlineUsers: number;
}

/**
 * 应用错误接口
 */
export interface AppError extends Error {
  code?: number;
  status?: number;
  data?: any;
  userFriendly?: boolean;
}
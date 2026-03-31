/**
 * 用户相关类型定义
 */

// 导入Article类型（在article.ts中定义）
import type { Article } from './article';

/**
 * 用户基本信息
 */
export interface User {
  id: string;
  username: string;
  email: string;
  avatar: string;
  bio?: string;
  createdAt: string;
  updatedAt?: string;
  followers: number;
  following: number;
  articleCount: number;
  videoCount: number;
  isCreator?: boolean; // 是否为创作者，用于首页展示
  isFollowed?: boolean; // 当前用户是否已关注该用户
}

/**
 * 登录请求参数
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * 注册请求参数
 */
export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * 认证响应数据
 */
export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
  expiresIn?: number; // 令牌过期时间（秒）
}

/**
 * 更新用户资料请求参数
 */
export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  avatar?: string;
  bio?: string;
}

/**
 * 刷新令牌请求参数
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * 用户信息响应
 */
export interface UserProfileResponse {
  user: User;
  articles: Article[]; // 用户发布的内容
  likedArticles?: Article[]; // 用户点赞的内容
  followers?: User[]; // 粉丝列表
  following?: User[]; // 关注列表
}

/**
 * 关注用户请求参数
 */
export interface FollowRequest {
  username: string;
}
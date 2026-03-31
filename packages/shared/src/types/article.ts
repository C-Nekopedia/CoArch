/**
 * 文章/视频内容相关类型定义
 */

import type { PaginationParams } from './api';

/**
 * 内容类型：文章或视频
 */
export type ContentType = 'article' | 'video';

/**
 * 文章/视频基本信息
 */
export interface Article {
  id: string;
  title: string;
  content: string;
  excerpt?: string; // 内容摘要
  cover: string;
  author: string;
  authorId: string;
  authorAvatar: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  views: number;
  likes: number;
  comments: number;
  type: ContentType;
  duration?: string; // 视频时长，格式: "HH:MM:SS" 或 "MM:SS"
  plays?: number;    // 播放量
  bilibiliUrl?: string; // 视频源链接（B站）
  bvid?: string; // B站视频BV号（从bilibiliUrl中提取）
  bilibiliViewCount?: number; // B站播放量
  bilibiliLikeCount?: number; // B站点赞量
  bilibiliDanmakuCount?: number; // B站弹幕数
  bilibiliAuthor?: string; // B站视频作者
  tags: string[];
  category?: string;
  isLiked?: boolean; // 当前用户是否已点赞
  isBookmarked?: boolean; // 当前用户是否已收藏
}

/**
 * 创建内容请求参数（文章或视频）
 */
export interface CreateArticleRequest {
  title: string;
  content: string;
  cover?: string; // 封面图URL或Base64
  type: ContentType;
  bilibiliUrl?: string; // 视频投稿专用：B站链接
  tags?: string[];
  category?: string;
  isDraft?: boolean; // 是否保存为草稿
}

/**
 * 更新内容请求参数
 */
export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  cover?: string;
  tags?: string[];
  category?: string;
}

/**
 * 内容列表查询参数
 */
export interface GetArticlesRequest extends PaginationParams {
  type?: ContentType; // 筛选类型：文章或视频
  author?: string;    // 按作者筛选
  category?: string;  // 按分类筛选
  tag?: string;       // 按标签筛选
  search?: string;    // 关键词搜索
  sortBy?: 'createdAt' | 'views' | 'likes' | 'comments';
  sortOrder?: 'asc' | 'desc';
}

/**
 * 内容详情响应
 */
export interface ArticleDetailResponse {
  article: Article;
  relatedArticles?: Article[]; // 相关推荐
}

/**
 * 删除内容响应
 */
export interface DeleteArticleResponse {
  success: boolean;
  message?: string;
  deletedId?: string;
}

/**
 * 点赞请求参数
 */
export interface LikeRequest {
  articleId: number;
}
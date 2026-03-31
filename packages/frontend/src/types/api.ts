/**
 * API接口类型定义
 * 此文件定义了前端与后端交互的所有请求和响应类型
 * 后端开发者应根据这些类型定义实现相应的API接口
 */

// ==================== 基础类型 ====================

/**
 * 通用API响应格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  timestamp?: string;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应数据
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ==================== 用户认证模块 ====================

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

// ==================== 内容管理模块 ====================

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

// ==================== 评论系统模块 ====================

/**
 * 评论信息
 */
export interface Comment {
  id: string;
  articleId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  likes: number;
  replies?: Comment[]; // 回复评论
  parentId?: string;   // 父评论ID（用于嵌套评论）
  isLiked?: boolean;   // 当前用户是否已点赞
}

/**
 * 添加评论请求参数
 */
export interface AddCommentRequest {
  articleId: string;
  content: string;
  parentId?: string; // 回复评论时指定父评论ID
}

/**
 * 更新评论请求参数
 */
export interface UpdateCommentRequest {
  content: string;
}

// ==================== 用户互动模块 ====================

/**
 * 点赞请求参数
 */
export interface LikeRequest {
  articleId: number;
}

/**
 * 关注用户请求参数
 */
export interface FollowRequest {
  username: string;
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

// ==================== 搜索模块 ====================

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

// ==================== 文件上传模块 ====================

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

// ==================== 系统状态模块 ====================

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

// ==================== API端点常量 ====================

/**
 * API端点配置
 * 注意：实际URL前缀由环境变量 VITE_API_BASE_URL 控制
 */
export const API_ENDPOINTS = {
  // 认证模块
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
    REFRESH_TOKEN: '/auth/refresh',
  },

  // 内容模块
  ARTICLES: {
    LIST: '/articles',
    DETAIL: (id: number) => `/articles/${id}`,
    CREATE: '/articles',
    UPDATE: (id: number) => `/articles/${id}`,
    DELETE: (id: number) => `/articles/${id}`,
    LIKE: (id: number) => `/articles/${id}/like`,
    VIEW: (id: number) => `/articles/${id}/view`,
  },

  // 评论模块
  COMMENTS: {
    LIST: (articleId: number) => `/articles/${articleId}/comments`,
    CREATE: (articleId: number) => `/articles/${articleId}/comments`,
    UPDATE: (id: number) => `/comments/${id}`,
    DELETE: (id: number) => `/comments/${id}`,
    LIKE: (id: number) => `/comments/${id}/like`,
  },

  // 用户模块
  USERS: {
    PROFILE: (username: string) => `/users/${username}`,
    ARTICLES: (username: string) => `/users/${username}/articles`,
    FOLLOW: (username: string) => `/users/${username}/follow`,
    FOLLOWERS: (username: string) => `/users/${username}/followers`,
    FOLLOWING: (username: string) => `/users/${username}/following`,
  },

  // 搜索模块
  SEARCH: {
    GLOBAL: '/search',
  },

  // 文件上传
  UPLOAD: {
    IMAGE: '/upload/image',
    VIDEO: '/upload/video',
    FILE: '/upload/file',
  },

  // 系统状态
  SYSTEM: {
    STATUS: '/system/status',
    HEALTH: '/system/health',
  },
} as const;

// ==================== 请求/响应类型映射 ====================

/**
 * 各API端点的请求和响应类型映射
 * 用于类型安全的API调用
 * 注意：此接口目前存在类型冲突（相同的端点值），已暂时注释掉
 */
/*
export interface ApiEndpoints {
  // 认证模块
  [API_ENDPOINTS.AUTH.LOGIN]: {
    request: LoginRequest;
    response: ApiResponse<AuthResponse>;
  };
  [API_ENDPOINTS.AUTH.REGISTER]: {
    request: RegisterRequest;
    response: ApiResponse<AuthResponse>;
  };
  [API_ENDPOINTS.AUTH.PROFILE]: {
    request: void;
    response: ApiResponse<User>;
  };
  [API_ENDPOINTS.AUTH.REFRESH_TOKEN]: {
    request: RefreshTokenRequest;
    response: ApiResponse<{ token: string; refreshToken: string; expiresIn: number }>;
  };

  // 内容模块
  [API_ENDPOINTS.ARTICLES.LIST]: {
    request: GetArticlesRequest;
    response: ApiResponse<PaginatedResponse<Article>>;
  };
  [API_ENDPOINTS.ARTICLES.CREATE]: {
    request: CreateArticleRequest;
    response: ApiResponse<Article>;
  };

  // 评论模块
  [API_ENDPOINTS.COMMENTS.CREATE]: {
    request: AddCommentRequest;
    response: ApiResponse<Comment>;
  };

  // 搜索模块
  [API_ENDPOINTS.SEARCH.GLOBAL]: {
    request: SearchRequest;
    response: ApiResponse<SearchResult>;
  };
}
*/
/**
 * API端点常量配置
 * 注意：实际URL前缀由环境变量或后端配置控制
 */

/**
 * API端点配置
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
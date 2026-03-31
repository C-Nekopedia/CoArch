/**
 * API调用示例
 * 此文件展示了如何将现有的模拟函数替换为真实API调用
 * 后端开发者可以参考这些示例实现相应的后端接口
 */

import api from '@config/api'
// 从类型定义文件导入
import type {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  GetArticlesRequest,
  CreateArticleRequest,
  Article,
  Comment,
  AddCommentRequest,
  PaginatedResponse
} from '@coarch/shared'

// 定义本地ApiResponse接口以避免TS6137错误
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  timestamp?: string;
}

// ==================== 用户认证示例 ====================

/**
 * 示例：真实登录API调用
 * 替换 src/stores/auth.ts 中的 login 函数
 */
export const realLogin = async (credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> => {
  try {
    // 使用配置好的API客户端发送请求
    const response = await api.post<AuthResponse>('/auth/login', credentials)

    if (response.success && response.data) {
      const { token, refreshToken, user } = response.data

      // 存储认证token
      api.setAuthToken(token)
      if (refreshToken) {
        api.setRefreshToken(refreshToken)
      }

      // 返回成功响应
      return {
        success: true,
        data: { user, token, refreshToken },
        message: '登录成功'
      }
    }

    // API返回了错误
    return {
      success: false,
      error: response.error || '登录失败',
      code: response.code
    }
  } catch (error) {
    // 网络错误或其他异常
    console.error('登录请求失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

/**
 * 示例：真实注册API调用
 * 替换 src/stores/auth.ts 中的 register 函数
 */
export const realRegister = async (data: RegisterRequest): Promise<ApiResponse<AuthResponse>> => {
  try {
    const response = await api.post<AuthResponse>('/auth/register', data)

    if (response.success && response.data) {
      const { token, refreshToken, user } = response.data

      // 存储认证token
      api.setAuthToken(token)
      if (refreshToken) {
        api.setRefreshToken(refreshToken)
      }

      return {
        success: true,
        data: { user, token, refreshToken },
        message: '注册成功'
      }
    }

    return {
      success: false,
      error: response.error || '注册失败',
      code: response.code
    }
  } catch (error) {
    console.error('注册请求失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

/**
 * 示例：获取当前用户信息
 * 替换本地存储的用户信息获取
 */
export const fetchCurrentUser = async (): Promise<ApiResponse<AuthResponse['user']>> => {
  try {
    const response = await api.get<AuthResponse['user']>('/auth/profile')

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: '获取用户信息成功'
      }
    }

    return {
      success: false,
      error: response.error || '获取用户信息失败',
      code: response.code
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

// ==================== 内容管理示例 ====================

/**
 * 示例：获取内容列表
 * 替换 src/stores/articles.ts 中的 loadArticles 函数
 */
export const fetchArticles = async (
  params: GetArticlesRequest = {}
): Promise<ApiResponse<PaginatedResponse<Article>>> => {
  try {
    // 构建查询参数
    const queryParams: Record<string, string | number | boolean> = {}
    if (params.page) queryParams.page = params.page
    if (params.pageSize) queryParams.pageSize = params.pageSize
    if (params.type) queryParams.type = params.type
    if (params.search) queryParams.search = params.search
    if (params.sortBy) queryParams.sortBy = params.sortBy
    if (params.sortOrder) queryParams.sortOrder = params.sortOrder

    const response = await api.get<PaginatedResponse<Article>>('/articles', queryParams)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: '获取内容列表成功'
      }
    }

    return {
      success: false,
      error: response.error || '获取内容列表失败',
      code: response.code
    }
  } catch (error) {
    console.error('获取内容列表失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

/**
 * 示例：获取单个内容详情
 * 替换 src/stores/articles.ts 中的 loadArticle 函数
 */
export const fetchArticle = async (id: number): Promise<ApiResponse<Article>> => {
  try {
    const response = await api.get<Article>(`/articles/${id}`)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: '获取内容详情成功'
      }
    }

    return {
      success: false,
      error: response.error || '内容不存在',
      code: response.code
    }
  } catch (error) {
    console.error('获取内容详情失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

/**
 * 示例：创建新内容（文章或视频）
 * 替换 src/views/Submit.vue 中的 handleArticleSubmit 和 handleVideoSubmit 函数
 */
export const createArticle = async (
  data: CreateArticleRequest
): Promise<ApiResponse<Article>> => {
  try {
    const response = await api.post<Article>('/articles', data)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: data.type === 'article' ? '文章发布成功' : '视频投稿成功'
      }
    }

    return {
      success: false,
      error: response.error || '发布失败',
      code: response.code
    }
  } catch (error) {
    console.error('发布内容失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

// ==================== 评论系统示例 ====================

/**
 * 示例：添加评论
 * 替换 src/stores/articles.ts 中的 addComment 函数
 */
export const addArticleComment = async (
  request: AddCommentRequest
): Promise<ApiResponse<Comment>> => {
  try {
    const { articleId, ...commentData } = request
    const response = await api.post<Comment>(`/articles/${articleId}/comments`, commentData)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: '评论发布成功'
      }
    }

    return {
      success: false,
      error: response.error || '评论失败',
      code: response.code
    }
  } catch (error) {
    console.error('发布评论失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

/**
 * 示例：获取评论列表
 */
export const fetchComments = async (
  articleId: number,
  page = 1,
  pageSize = 20
): Promise<ApiResponse<PaginatedResponse<Comment>>> => {
  try {
    const response = await api.get<PaginatedResponse<Comment>>(
      `/articles/${articleId}/comments`,
      { page, pageSize }
    )

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: '获取评论成功'
      }
    }

    return {
      success: false,
      error: response.error || '获取评论失败',
      code: response.code
    }
  } catch (error) {
    console.error('获取评论失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

// ==================== 用户互动示例 ====================

/**
 * 示例：点赞/取消点赞内容
 */
export const likeArticle = async (articleId: number): Promise<ApiResponse<{
  likes: number;
  isLiked: boolean;
}>> => {
  try {
    const response = await api.post<{ likes: number; isLiked: boolean }>(
      `/articles/${articleId}/like`
    )

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: response.data.isLiked ? '点赞成功' : '取消点赞成功'
      }
    }

    return {
      success: false,
      error: response.error || '操作失败',
      code: response.code
    }
  } catch (error) {
    console.error('点赞操作失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

/**
 * 示例：关注/取消关注用户
 */
export const followUser = async (username: string): Promise<ApiResponse<{
  isFollowing: boolean;
  followers: number;
}>> => {
  try {
    const response = await api.post<{ isFollowing: boolean; followers: number }>(
      `/users/${username}/follow`
    )

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: response.data.isFollowing ? '关注成功' : '取消关注成功'
      }
    }

    return {
      success: false,
      error: response.error || '操作失败',
      code: response.code
    }
  } catch (error) {
    console.error('关注操作失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

// ==================== 文件上传示例 ====================

/**
 * 示例：上传图片
 * 注意：后端API路径为 /api/v1/upload/image
 * 前端配置的API_BASE_URL已包含 /api/v1，因此这里使用相对路径 /upload/image
 */
export const uploadImage = async (file: File): Promise<ApiResponse<{
  url: string;
  filename: string;
  size: number;
  mimetype: string;
}>> => {
  try {
    const formData = new FormData()
    formData.append('file', file)

    // 注意：上传文件时需要使用特殊的请求头
    const response = await api.post<{
      url: string;
      filename: string;
      size: number;
      mimetype: string;
    }>('/upload/image', formData, {
      headers: {
        // 不要设置Content-Type，浏览器会自动设置multipart/form-data
      }
    })

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: '图片上传成功'
      }
    }

    return {
      success: false,
      error: response.error || '上传失败',
      code: response.code
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

// ==================== 搜索功能示例 ====================

/**
 * 示例：全局搜索
 */
export const globalSearch = async (
  query: string,
  type?: 'article' | 'video' | 'user' | 'all',
  page = 1,
  pageSize = 20
): Promise<ApiResponse<{
  articles: Article[];
  users: any[]; // 简化的用户类型
  total: number;
}>> => {
  try {
    const params: Record<string, string | number | boolean> = {
      q: query,
      page,
      pageSize
    }
    if (type && type !== 'all') {
      params.type = type
    }

    const response = await api.get<{
      articles: Article[];
      users: any[];
      total: number;
    }>('/search', params)

    if (response.success && response.data) {
      return {
        success: true,
        data: response.data,
        message: '搜索成功'
      }
    }

    return {
      success: false,
      error: response.error || '搜索失败',
      code: response.code
    }
  } catch (error) {
    console.error('搜索失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络请求失败'
    }
  }
}

// ==================== Store函数替换指南 ====================

/**
 * 如何替换现有store中的模拟函数：
 *
 * 1. 在store文件中导入API示例函数：
 *    import { realLogin, realRegister, fetchArticles } from '@services/api-examples'
 *
 * 2. 替换模拟函数调用：
 *    // 原来的模拟登录
 *    const login = async (credentials) => {
 *      // ... 模拟代码
 *    }
 *
 *    // 替换为真实API调用
 *    const login = async (credentials) => {
 *      isLoading.value = true
 *      error.value = null
 *
 *      try {
 *        const result = await realLogin(credentials)
 *        if (result.success && result.data) {
 *          user.value = result.data.user
 *          token.value = result.data.token
 *          // ... 其他状态更新
 *          return { success: true, user: result.data.user }
 *        } else {
 *          error.value = result.error || '登录失败'
 *          return { success: false, error: error.value }
 *        }
 *      } catch (err) {
 *        error.value = '网络请求失败'
 *        return { success: false, error: error.value }
 *      } finally {
 *        isLoading.value = false
 *      }
 *    }
 *
 * 3. 保持原有的函数签名和返回格式，确保组件代码无需修改。
 */

export default {
  // 认证相关
  realLogin,
  realRegister,
  fetchCurrentUser,

  // 内容相关
  fetchArticles,
  fetchArticle,
  createArticle,

  // 评论相关
  addArticleComment,
  fetchComments,

  // 互动相关
  likeArticle,
  followUser,

  // 文件上传
  uploadImage,

  // 搜索功能
  globalSearch,
}
/**
 * API客户端配置
 * 提供统一的HTTP请求方法，支持请求/响应拦截器、错误处理和认证token自动添加
 * 后端开发者可以根据需要调整此配置以匹配后端API规范
 */

// 使用共享类型定义
import type { ApiResponse as SharedApiResponse } from '@coarch/shared'
import { ErrorCode } from '@coarch/shared'

// 重新导出共享的ApiResponse类型
export type ApiResponse<T = any> = SharedApiResponse<T>

// API基础URL，从环境变量读取
// 注意：后端API路径为 /api/v1/，即使API_VERSION设置为'1'，NestJS也会自动添加'v'前缀
// 开发环境配置为 http://localhost:3001/api/v1，生产环境通常为 /api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1'

// 请求超时时间（毫秒）
const REQUEST_TIMEOUT = 30000

// 存储认证token的key（localStorage - 持久化，sessionStorage - 会话级别）
const TOKEN_STORAGE_KEY = 'auth_token'
const REFRESH_TOKEN_STORAGE_KEY = 'auth_refresh_token'
const REMEMBER_ME_KEY = 'auth_remember_me'
const SESSION_TOKEN_KEY = 'session_auth_token'
const SESSION_REFRESH_TOKEN_KEY = 'session_auth_refresh_token'

export {
  TOKEN_STORAGE_KEY,
  REFRESH_TOKEN_STORAGE_KEY,
  REMEMBER_ME_KEY,
  SESSION_TOKEN_KEY,
  SESSION_REFRESH_TOKEN_KEY
}

// ==================== 类型定义 ====================

export interface RequestOptions extends RequestInit {
  timeout?: number
  headers?: Record<string, string>
  params?: Record<string, string | number | boolean>
  // 是否跳过默认错误处理
  skipErrorHandler?: boolean
  // 是否跳过认证token
  skipAuth?: boolean
}

export interface ApiError extends Error {
  status?: number
  code?: number
  data?: any
}

// ==================== Token管理 ====================

/**
 * 获取当前认证token（优先从sessionStorage获取，其次localStorage）
 */
export const getAuthToken = (): string | null => {
  return sessionStorage.getItem(SESSION_TOKEN_KEY) || localStorage.getItem(TOKEN_STORAGE_KEY)
}

/**
 * 设置认证token
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token)
}

/**
 * 获取刷新token（优先从sessionStorage获取，其次localStorage）
 */
export const getRefreshToken = (): string | null => {
  return sessionStorage.getItem(SESSION_REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY)
}

/**
 * 设置刷新token
 */
export const setRefreshToken = (token: string): void => {
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, token)
}

/**
 * 清除所有认证token（包括localStorage和sessionStorage）
 */
export const clearAuthTokens = (): void => {
  localStorage.removeItem(TOKEN_STORAGE_KEY)
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY)
  localStorage.removeItem(REMEMBER_ME_KEY)

  sessionStorage.removeItem(SESSION_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_REFRESH_TOKEN_KEY)
  sessionStorage.removeItem(REMEMBER_ME_KEY)
}

// ==================== 请求拦截器 ====================

/**
 * 请求拦截器
 * 在发送请求前对配置进行处理
 */
const requestInterceptor = (options: RequestOptions, body?: any): RequestOptions => {
  const headers = new Headers(options.headers)

  // 添加认证token（如果存在且未跳过）
  if (!options.skipAuth) {
    const token = getAuthToken()
    if (token) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }

  // 设置默认Content-Type（排除FormData，因为浏览器会自动设置multipart/form-data）
  const isFormData = body instanceof FormData
  if (!headers.has('Content-Type') && options.method && ['POST', 'PUT', 'PATCH'].includes(options.method.toUpperCase()) && !isFormData) {
    headers.set('Content-Type', 'application/json')
  }

  // 添加其他默认头
  headers.set('Accept', 'application/json')

  return {
    ...options,
    headers: Object.fromEntries(headers.entries()),
  }
}

// ==================== 响应拦截器 ====================

/**
 * 响应拦截器
 * 处理HTTP响应，包括错误状态码和网络错误
 */
const responseInterceptor = async <T>(response: Response, _options: RequestOptions): Promise<ApiResponse<T>> => {
  // 检查HTTP状态码
  if (!response.ok) {
    const error = new Error(`HTTP error ${response.status}: ${response.statusText}`) as ApiError
    error.status = response.status

    try {
      const errorData = await response.json()
      error.data = errorData
      error.message = errorData.message || errorData.error || error.message
      error.code = errorData.code
      // 调试日志：记录认证错误
      if (error.status === 401 || error.status === 403 || error.status === 500) {
        console.warn('API认证错误响应:', {
          status: error.status,
          message: error.message,
          data: errorData,
          endpoint: response.url
        })
      }
    } catch {
      // 无法解析JSON错误响应
      const textError = await response.text() || error.message
      error.message = textError
      // 调试日志：记录非JSON错误响应
      if (error.status === 401 || error.status === 403 || error.status === 500) {
        console.warn('API认证错误（非JSON响应）:', {
          status: error.status,
          message: textError,
          endpoint: response.url
        })
      }
    }

    throw error
  }

  // 处理204 No Content
  if (response.status === 204) {
    return { success: true } as ApiResponse<T>
  }

  // 解析JSON响应
  try {
    const data = await response.json()

    // 检查API自定义错误码（假设success字段表示操作成功）
    if (data.success === false) {
      const error = new Error(data.message || data.error || 'API请求失败') as ApiError
      error.code = data.code
      error.data = data
      throw error
    }

    return data as ApiResponse<T>
  } catch (error) {
    // JSON解析失败
    if (error instanceof SyntaxError) {
      const apiError = new Error('服务器返回了无效的JSON数据') as ApiError
      apiError.status = response.status
      throw apiError
    }
    throw error
  }
}

// ==================== 核心HTTP客户端 ====================

/**
 * 构建完整URL（添加查询参数）
 */
const buildUrl = (endpoint: string, params?: Record<string, string | number | boolean>): string => {
  let url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`

  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString
    }
  }

  return url
}

/**
 * 带超时的fetch请求
 */
const fetchWithTimeout = async (url: string, options: RequestOptions): Promise<Response> => {
  const timeout = options.timeout || REQUEST_TIMEOUT
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`请求超时 (${timeout}ms)`)
    }
    throw error
  }
}

/**
 * 通用HTTP请求方法
 */
export const http = async <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  try {
    // 应用请求拦截器
    const processedOptions = requestInterceptor(options, options.body)

    // 构建完整URL
    const url = buildUrl(endpoint, processedOptions.params)

    // 发送请求（带超时）
    const response = await fetchWithTimeout(url, {
      ...processedOptions,
      // 确保body是JSON字符串（如果是对象）
      body: processedOptions.body && typeof processedOptions.body === 'object' && !(processedOptions.body instanceof FormData)
        ? JSON.stringify(processedOptions.body)
        : processedOptions.body,
    })

    // 应用响应拦截器
    return await responseInterceptor<T>(response, options)
  } catch (error) {
    // 网络错误或其他未处理错误
    if (!options.skipErrorHandler) {
      handleNetworkError(error)
    }
    throw error
  }
}

// ==================== 便捷方法 ====================

/**
 * GET请求
 */
export const get = <T = any>(
  endpoint: string,
  params?: Record<string, string | number | boolean>,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  return http<T>(endpoint, {
    ...options,
    method: 'GET',
    params,
  })
}

/**
 * POST请求
 */
export const post = <T = any>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  return http<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data,
  })
}

/**
 * PUT请求
 */
export const put = <T = any>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  return http<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data,
  })
}

/**
 * PATCH请求
 */
export const patch = <T = any>(
  endpoint: string,
  data?: any,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  return http<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: data,
  })
}

/**
 * DELETE请求
 */
export const del = <T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<ApiResponse<T>> => {
  return http<T>(endpoint, {
    ...options,
    method: 'DELETE',
  })
}

// ==================== 错误处理 ====================

/**
 * 处理网络错误
 */
const handleNetworkError = (error: any): void => {
  console.error('API请求失败:', error)

  // 这里可以添加全局错误处理逻辑，例如：
  // - 显示错误提示
  // - 跳转到登录页（如果是认证错误）
  // - 记录错误日志

  // 示例：根据错误类型显示不同的用户提示
  let userMessage = '网络请求失败，请检查网络连接'

  // 首先检查错误代码（如果存在）
  if (error.code) {
    switch (error.code) {
      case ErrorCode.UNAUTHORIZED:
      case ErrorCode.TOKEN_EXPIRED:
        userMessage = '登录已过期，请重新登录'
        break
      case ErrorCode.FORBIDDEN:
      case ErrorCode.INSUFFICIENT_PERMISSIONS:
        userMessage = '权限不足，无法访问此资源'
        break
      case ErrorCode.RESOURCE_NOT_FOUND:
        userMessage = '请求的资源不存在'
        break
      case ErrorCode.VALIDATION_ERROR:
      case ErrorCode.INVALID_INPUT:
        userMessage = '输入数据验证失败，请检查后重试'
        break
      case ErrorCode.INTERNAL_SERVER_ERROR:
      case ErrorCode.DATABASE_ERROR:
        userMessage = '服务器内部错误，请稍后重试'
        break
      case ErrorCode.NETWORK_ERROR:
      case ErrorCode.REQUEST_TIMEOUT:
        userMessage = '网络连接错误，请检查网络连接'
        break
      default:
        // 使用默认消息，继续检查HTTP状态码
        break
    }
  }

  // 如果没有通过错误代码确定消息，则回退到HTTP状态码
  if (userMessage === '网络请求失败，请检查网络连接') {
    if (error.status === 401) {
      userMessage = '登录已过期，请重新登录'
      // 注意：401错误现在由requestWithRetry处理，这里只显示消息
      // 不清除token，让requestWithRetry尝试刷新
    } else if (error.status === 403) {
      userMessage = '权限不足，无法访问此资源'
    } else if (error.status === 404) {
      userMessage = '请求的资源不存在'
    } else if (error.status === 500) {
      userMessage = '服务器内部错误，请稍后重试'
    } else if (error.message?.includes('timeout')) {
      userMessage = '请求超时，请检查网络连接或稍后重试'
    }
  }

  // 在实际项目中，这里应该调用UI store显示错误消息
  // 例如：useUIStore().showError(userMessage)
  console.warn('用户提示:', userMessage)
}

/**
 * 刷新访问令牌
 * 注意：此函数需要后端提供刷新令牌的接口
 */
export const refreshAccessToken = async (): Promise<boolean> => {
  const refreshToken = getRefreshToken()
  if (!refreshToken) {
    return false
  }

  try {
    console.log('开始刷新访问令牌，刷新令牌存在:', !!refreshToken)
    const response = await http<{ token: string; refreshToken: string; expiresIn: number }>('/auth/refresh', {
      method: 'POST',
      body: { refreshToken } as any,
      skipAuth: true,
      skipErrorHandler: true,
    })

    console.log('刷新令牌API响应:', response)

    if (response.success && response.data) {
      // 后端返回的数据结构：{ token, refreshToken, expiresIn, user }
      console.log('令牌刷新成功，设置新令牌')
      setAuthToken(response.data.token)
      setRefreshToken(response.data.refreshToken)
      return true
    } else {
      console.log('刷新令牌API返回失败:', response.error)
    }
  } catch (error) {
    console.error('刷新令牌失败:', error)
    // 刷新失败，清除所有token
    clearAuthTokens()
  }

  console.log('刷新令牌失败，返回false')
  return false
}

// ==================== 请求重试机制 ====================

/**
 * 带重试机制的请求（主要用于处理令牌过期）
 */
export const requestWithRetry = async <T = any>(
  endpoint: string,
  options: RequestOptions = {},
  maxRetries = 1
): Promise<ApiResponse<T>> => {
  try {
    // 在requestWithRetry中跳过默认错误处理，由本函数处理认证错误
    return await http<T>(endpoint, {
      ...options,
      skipErrorHandler: true
    })
  } catch (error) {
    const apiError = error as ApiError

    // 检查是否是认证相关的错误（包括令牌过期、无效令牌等）
    const isAuthError =
      // HTTP状态码为401或403
      apiError.status === 401 || apiError.status === 403 ||
      // 或者错误消息中包含认证相关的关键词
      (apiError.message && (
        apiError.message.toLowerCase().includes('token') ||
        apiError.message.toLowerCase().includes('auth') ||
        apiError.message.toLowerCase().includes('unauthorized') ||
        apiError.message.toLowerCase().includes('expired') ||
        apiError.message.toLowerCase().includes('invalid') ||
        apiError.message.toLowerCase().includes('未授权')
      )) ||
      // 对于需要认证的敏感端点，即使是500错误也尝试刷新令牌
      (!options.skipAuth && apiError.status === 500 && (
        endpoint.includes('/comments/') ||
        endpoint.includes('/articles/') ||
        endpoint.includes('/users/')
      ))

    // 如果是认证错误且不是刷新token的请求，尝试刷新token后重试
    if (isAuthError &&
        !options.skipAuth &&
        maxRetries > 0 &&
        !endpoint.includes('/auth/refresh')) {
      // 检查用户是否已登录（是否有token）
      const hasToken = getAuthToken()
      if (!hasToken) {
        // 用户未登录，直接抛出错误，不跳转到登录页
        throw error
      }
      console.log('检测到认证错误，尝试刷新令牌:', apiError.message, '状态码:', apiError.status)
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        console.log('令牌刷新成功，重试原始请求')
        // 使用新的token重试请求
        return requestWithRetry<T>(endpoint, options, maxRetries - 1)
      } else {
        console.log('令牌刷新失败，清除本地令牌并跳转到登录页')
        // 刷新失败，清除所有token
        clearAuthTokens()
        // 跳转到登录页
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    throw error
  }
}

// ==================== 导出配置 ====================

/**
 * API客户端配置对象
 */
export const apiConfig = {
  baseUrl: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  tokenStorageKey: TOKEN_STORAGE_KEY,
  refreshTokenStorageKey: REFRESH_TOKEN_STORAGE_KEY,
}

export default {
  // 核心方法
  http,
  get,
  post,
  put,
  patch,
  delete: del,

  // 工具方法
  requestWithRetry,
  refreshAccessToken,

  // Token管理
  getAuthToken,
  setAuthToken,
  getRefreshToken,
  setRefreshToken,
  clearAuthTokens,

  // 配置
  config: apiConfig,
}
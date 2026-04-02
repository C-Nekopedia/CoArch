/**
 * 错误处理工具
 * 提供统一的错误处理机制，包括网络错误、API错误、业务逻辑错误等
 * 后端开发者可以参考此工具实现相应的错误处理逻辑
 */

import { useUIStore } from '@stores/ui'
import { ErrorCode as SharedErrorCode, type ErrorCodeType } from '@coarch/shared'

// ==================== 错误类型定义 ====================

export interface AppError extends Error {
  code?: number
  status?: number
  data?: any
  userFriendly?: boolean
}

// 使用共享错误代码
export const ErrorCode = SharedErrorCode
export type ErrorCode = ErrorCodeType

// ==================== 错误创建函数 ====================

/**
 * 创建应用错误对象
 */
export const createError = (
  message: string,
  code?: ErrorCode,
  options: {
    status?: number
    data?: any
    userFriendly?: boolean
  } = {}
): AppError => {
  const error = new Error(message) as AppError
  error.code = code
  error.status = options.status
  error.data = options.data
  error.userFriendly = options.userFriendly ?? true
  error.name = 'AppError'
  return error
}

/**
 * 从HTTP响应创建错误
 */
export const createErrorFromResponse = (response: Response, data?: any): AppError => {
  const status = response.status
  let message = `HTTP ${status}`
  let code: ErrorCode | undefined

  switch (status) {
    case 400:
      message = data?.message || '请求参数错误'
      code = ErrorCode.VALIDATION_ERROR
      break
    case 401:
      message = data?.message || '未授权访问'
      code = ErrorCode.UNAUTHORIZED
      break
    case 403:
      message = data?.message || '权限不足'
      code = ErrorCode.FORBIDDEN
      break
    case 404:
      message = data?.message || '资源不存在'
      code = ErrorCode.RESOURCE_NOT_FOUND
      break
    case 422:
      message = data?.message || '数据验证失败'
      code = ErrorCode.VALIDATION_ERROR
      break
    case 500:
      message = data?.message || '服务器内部错误'
      code = ErrorCode.INTERNAL_SERVER_ERROR
      break
    case 502:
    case 503:
    case 504:
      message = data?.message || '服务暂时不可用'
      code = ErrorCode.SERVICE_UNAVAILABLE
      break
  }

  return createError(message, code, {
    status,
    data,
    userFriendly: true,
  })
}

/**
 * 从网络错误创建错误
 */
export const createErrorFromNetwork = (error: any): AppError => {
  if (error.name === 'AbortError') {
    return createError('请求超时，请检查网络连接', ErrorCode.REQUEST_TIMEOUT, {
      userFriendly: true,
    })
  }

  if (!navigator.onLine) {
    return createError('网络连接已断开，请检查网络设置', ErrorCode.NETWORK_OFFLINE, {
      userFriendly: true,
    })
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createError('网络请求失败，请检查网络连接', ErrorCode.NETWORK_ERROR, {
      userFriendly: true,
    })
  }

  // 未知错误
  return createError(error.message || '未知错误', undefined, {
    userFriendly: false,
  })
}

// ==================== 错误处理函数 ====================

/**
 * 处理错误并显示用户友好的消息
 */
export const handleError = (error: any, context?: string): void => {
  const uiStore = useUIStore()
  let appError: AppError

  // 转换为AppError
  if (error instanceof Error && 'code' in error) {
    appError = error as AppError
  } else if (error instanceof Response) {
    appError = createErrorFromResponse(error)
  } else {
    appError = createErrorFromNetwork(error)
  }

  // 记录错误日志（开发环境）
  if (import.meta.env.DEV) {
    console.error(`[错误处理] ${context ? `上下文: ${context}, ` : ''}错误详情:`, {
      message: appError.message,
      code: appError.code,
      status: appError.status,
      data: appError.data,
      stack: appError.stack,
    })
  }

  // 显示用户友好的错误消息
  if (appError.userFriendly) {
    const errorMessage = appError.message
    uiStore.showError(errorMessage)
  } else {
    // 非用户友好错误，显示通用消息
    uiStore.showError('操作失败，请稍后重试')
  }

  // 特殊错误处理
  switch (appError.code) {
    case ErrorCode.UNAUTHORIZED:
    case ErrorCode.TOKEN_EXPIRED:
      // 认证错误，可能需要跳转到登录页
      // 注意：避免循环重定向
      if (!window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`
        }, 1500)
      }
      break

    case ErrorCode.FORBIDDEN:
    case ErrorCode.INSUFFICIENT_PERMISSIONS:
      // 权限不足，可以记录日志或上报
      console.warn('用户权限不足:', context)
      break

    case ErrorCode.NETWORK_OFFLINE:
      // 网络断开，可以显示重试按钮
      console.warn('网络连接已断开')
      break
  }
}

/**
 * 安全执行异步操作，自动处理错误
 */
export const safeExecute = async <T>(
  operation: () => Promise<T>,
  context?: string,
  options: {
    showError?: boolean
    defaultValue?: T
  } = {}
): Promise<T | undefined> => {
  const { showError = true, defaultValue } = options

  try {
    return await operation()
  } catch (error) {
    if (showError) {
      handleError(error, context)
    }
    return defaultValue
  }
}

/**
 * 重试机制：失败后自动重试指定次数
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000,
  context?: string
): Promise<T> => {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error

      if (attempt < maxRetries) {
        console.warn(`[重试机制] ${context ? `上下文: ${context}, ` : ''}第 ${attempt} 次尝试失败，${delayMs}ms后重试:`, error)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        // 指数退避
        delayMs *= 2
      }
    }
  }

  throw lastError
}

/**
 * 错误边界：包装组件级别的错误处理
 */
export const withErrorBoundary = <T extends (...args: any[]) => any>(
  fn: T,
  context?: string
): ((...args: Parameters<T>) => ReturnType<T> | undefined) => {
  return (...args: Parameters<T>): ReturnType<T> | undefined => {
    try {
      return fn(...args)
    } catch (error) {
      handleError(error, context)
      return undefined
    }
  }
}

// ==================== 验证工具 ====================

/**
 * 验证输入数据，失败时抛出错误
 */
export const validateInput = (
  value: any,
  rules: {
    required?: boolean
    minLength?: number
    maxLength?: number
    pattern?: RegExp
    custom?: (value: any) => boolean | string
  },
  fieldName: string
): void => {
  if (rules.required && (value === undefined || value === null || value === '')) {
    throw createError(`${fieldName}不能为空`, ErrorCode.VALIDATION_ERROR, {
      userFriendly: true,
    })
  }

  if (value !== undefined && value !== null && value !== '') {
    if (rules.minLength !== undefined && String(value).length < rules.minLength) {
      throw createError(
        `${fieldName}长度不能少于${rules.minLength}个字符`,
        ErrorCode.VALIDATION_ERROR,
        { userFriendly: true }
      )
    }

    if (rules.maxLength !== undefined && String(value).length > rules.maxLength) {
      throw createError(
        `${fieldName}长度不能超过${rules.maxLength}个字符`,
        ErrorCode.VALIDATION_ERROR,
        { userFriendly: true }
      )
    }

    if (rules.pattern && !rules.pattern.test(String(value))) {
      throw createError(`${fieldName}格式不正确`, ErrorCode.VALIDATION_ERROR, {
        userFriendly: true,
      })
    }

    if (rules.custom) {
      const result = rules.custom(value)
      if (result !== true) {
        throw createError(
          typeof result === 'string' ? result : `${fieldName}验证失败`,
          ErrorCode.VALIDATION_ERROR,
          { userFriendly: true }
        )
      }
    }
  }
}

// ==================== 错误上报 ====================

/**
 * 上报错误到监控系统（示例）
 */
export const reportError = async (
  error: AppError,
  context?: Record<string, any>
): Promise<void> => {
  // 在实际项目中，这里应该将错误发送到错误监控系统（如Sentry、Bugsnag等）
  // 这里只是一个示例实现

  const errorReport = {
    timestamp: new Date().toISOString(),
    message: error.message,
    code: error.code,
    status: error.status,
    data: error.data,
    context,
    userAgent: navigator.userAgent,
    url: window.location.href,
    stack: error.stack,
  }

  // 开发环境：打印到控制台
  if (import.meta.env.DEV) {
    console.error('[错误上报]', errorReport)
  }

  // 生产环境：发送到错误收集端点
  if (import.meta.env.PROD) {
    try {
      // 注意：这里需要后端提供错误收集接口
      // await fetch('/api/error-report', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport),
      // })
    } catch (reportError) {
      console.error('错误上报失败:', reportError)
    }
  }
}

// ==================== 默认导出 ====================

export default {
  // 错误类型
  ErrorCode,

  // 错误创建
  createError,
  createErrorFromResponse,
  createErrorFromNetwork,

  // 错误处理
  handleError,
  safeExecute,
  withRetry,
  withErrorBoundary,

  // 验证工具
  validateInput,

  // 错误上报
  reportError,
}
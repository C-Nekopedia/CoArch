/**
 * 基础错误处理工具函数
 */

import type { AppError } from '../types/additional';
import { ErrorCode, ErrorCodeType } from '../constants/error-codes';

/**
 * 创建应用错误对象
 */
export const createError = (
  message: string,
  code?: ErrorCodeType,
  options: {
    status?: number;
    data?: any;
    userFriendly?: boolean;
  } = {}
): AppError => {
  const error = new Error(message) as AppError;
  error.code = code;
  error.status = options.status;
  error.data = options.data;
  error.userFriendly = options.userFriendly ?? true;
  error.name = 'AppError';
  return error;
};

/**
 * 从HTTP响应创建错误
 */
export const createErrorFromResponse = (response: Response, data?: any): AppError => {
  const status = response.status;
  let message = `HTTP ${status}`;
  let code: ErrorCodeType | undefined;

  switch (status) {
    case 400:
      message = data?.message || '请求参数错误';
      code = ErrorCode.VALIDATION_ERROR;
      break;
    case 401:
      message = data?.message || '未授权访问';
      code = ErrorCode.UNAUTHORIZED;
      break;
    case 403:
      message = data?.message || '权限不足';
      code = ErrorCode.FORBIDDEN;
      break;
    case 404:
      message = data?.message || '资源不存在';
      code = ErrorCode.RESOURCE_NOT_FOUND;
      break;
    case 422:
      message = data?.message || '数据验证失败';
      code = ErrorCode.VALIDATION_ERROR;
      break;
    case 500:
      message = data?.message || '服务器内部错误';
      code = ErrorCode.INTERNAL_SERVER_ERROR;
      break;
    case 502:
    case 503:
    case 504:
      message = data?.message || '服务暂时不可用';
      code = ErrorCode.SERVICE_UNAVAILABLE;
      break;
  }

  return createError(message, code, {
    status,
    data,
    userFriendly: true,
  });
};

/**
 * 从网络错误创建错误
 */
export const createErrorFromNetwork = (error: any): AppError => {
  if (error.name === 'AbortError') {
    return createError('请求超时，请检查网络连接', ErrorCode.REQUEST_TIMEOUT, {
      userFriendly: true,
    });
  }

  // 注意：navigator.onLine只在浏览器环境中可用
  if (typeof navigator !== 'undefined' && 'onLine' in navigator && !navigator.onLine) {
    return createError('网络连接已断开，请检查网络设置', ErrorCode.NETWORK_OFFLINE, {
      userFriendly: true,
    });
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    return createError('网络请求失败，请检查网络连接', ErrorCode.NETWORK_ERROR, {
      userFriendly: true,
    });
  }

  // 未知错误
  return createError(error.message || '未知错误', undefined, {
    userFriendly: false,
  });
};
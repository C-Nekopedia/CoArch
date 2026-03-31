import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interceptors/response.interceptor';
import { ErrorCode } from '@coarch/shared';

/**
 * HTTP异常过滤器
 * 将NestJS异常转换为统一的错误响应格式
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // 获取错误信息
    let errorMessage = '服务器内部错误';
    let errorCode = status * 100; // 默认错误码为HTTP状态码 * 100
    let detailMessage: string | undefined;

    if (typeof exceptionResponse === 'string') {
      errorMessage = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as any;

      // 提取错误信息
      if (responseObj.message) {
        if (Array.isArray(responseObj.message)) {
          errorMessage = responseObj.message[0] || errorMessage;
        } else {
          errorMessage = responseObj.message;
        }
      }

      if (responseObj.error) {
        detailMessage = responseObj.error;
      }

      // 自定义错误码
      if (responseObj.code) {
        errorCode = responseObj.code;
      }
    }

    // 根据HTTP状态码设置错误分类
    if (status >= 500) {
      errorMessage = '服务器内部错误，请稍后重试';
      errorCode = ErrorCode.INTERNAL_SERVER_ERROR;
    } else if (status === HttpStatus.UNAUTHORIZED) {
      errorMessage = errorMessage || '未授权访问';
      errorCode = ErrorCode.UNAUTHORIZED;
    } else if (status === HttpStatus.FORBIDDEN) {
      errorMessage = errorMessage || '权限不足';
      errorCode = ErrorCode.FORBIDDEN;
    } else if (status === HttpStatus.NOT_FOUND) {
      errorMessage = errorMessage || '资源不存在';
      errorCode = ErrorCode.RESOURCE_NOT_FOUND;
    } else if (status === HttpStatus.BAD_REQUEST) {
      errorMessage = errorMessage || '请求参数错误';
      errorCode = ErrorCode.VALIDATION_ERROR;
    } else if (status === HttpStatus.UNPROCESSABLE_ENTITY) {
      errorMessage = errorMessage || '数据验证失败';
      errorCode = ErrorCode.VALIDATION_ERROR;
    }

    // 构建统一错误响应
    const errorResponse: ApiResponse = {
      success: false,
      error: errorMessage,
      code: errorCode,
      message: detailMessage,
      timestamp: new Date().toISOString(),
    };

    // 生产环境隐藏详细错误信息
    if (process.env.NODE_ENV === 'production') {
      delete errorResponse.message;
    }

    response.status(status).json(errorResponse);
  }
}
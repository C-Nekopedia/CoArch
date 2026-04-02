import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiResponse } from '../interceptors/response.interceptor';

interface ExceptionResponseObject {
  message?: string | string[];
  error?: string;
  code?: number;
}

interface PrismaClientKnownRequestError {
  name: 'PrismaClientKnownRequestError';
  code: string;
  message: string;
}

interface PrismaClientValidationError {
  name: 'PrismaClientValidationError';
  message: string;
}

interface ValidationError {
  name: 'ValidationError';
  message?: string;
}

interface UnauthorizedError {
  name: 'UnauthorizedError';
  message?: string;
}

type KnownError =
  | PrismaClientKnownRequestError
  | PrismaClientValidationError
  | ValidationError
  | UnauthorizedError;

function isKnownError(error: unknown): error is KnownError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    typeof (error as Record<string, unknown>).name === 'string'
  );
}

/**
 * 全局异常过滤器
 * 捕获所有未被处理的异常，返回统一的错误响应
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorMessage = '服务器内部错误';
    let errorCode = 9000; // 系统错误起始码
    let detailMessage: string | undefined;

    // 处理HttpException
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        errorMessage = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as ExceptionResponseObject;

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

        if (responseObj.code) {
          errorCode = responseObj.code;
        }
      }
    }
    // 处理Prisma和其他已知错误
    else if (isKnownError(exception)) {
      const error = exception;

      // Prisma客户端错误
      if (error.name === 'PrismaClientKnownRequestError') {
        errorMessage = '数据库请求错误';
        detailMessage = error.message;

        // 根据错误代码设置更友好的消息
        if (error.code === 'P2002') {
          errorMessage = '数据已存在，请勿重复创建';
          errorCode = 4001;
          status = HttpStatus.CONFLICT;
        } else if (error.code === 'P2025') {
          errorMessage = '记录不存在';
          errorCode = 4040;
          status = HttpStatus.NOT_FOUND;
        }
      }
      // Prisma验证错误
      else if (error.name === 'PrismaClientValidationError') {
        errorMessage = '数据验证失败';
        errorCode = 4220;
        status = HttpStatus.UNPROCESSABLE_ENTITY;
        detailMessage = error.message;
      }
      // 其他已知错误
      else if (error.name === 'ValidationError') {
        errorMessage = '数据验证失败';
        errorCode = 4220;
        status = HttpStatus.UNPROCESSABLE_ENTITY;
      } else if (error.name === 'UnauthorizedError') {
        errorMessage = '未授权访问';
        errorCode = 1001;
        status = HttpStatus.UNAUTHORIZED;
      }
    }
    // 处理原生错误对象
    else if (exception instanceof Error) {
      errorMessage = exception.message || errorMessage;
      detailMessage = exception.stack;
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

    // 记录错误日志（实际项目中应该使用Logger）
    console.error(`[${new Date().toISOString()}] 异常捕获:`, {
      status,
      error: errorMessage,
      code: errorCode,
      detail: detailMessage,
      exception,
    });

    response.status(status).json(errorResponse);
  }
}

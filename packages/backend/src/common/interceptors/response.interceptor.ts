import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 统一API响应格式
 * 遵循前端定义的 ApiResponse<T> 格式
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: number;
  timestamp?: string;
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    // 设置响应头
    response.setHeader('X-Powered-By', 'Co-Arch API');
    response.setHeader('X-Request-Id', request.id || Date.now().toString());

    return next.handle().pipe(
      map((data) => {
        // 如果已经是ApiResponse格式，直接返回
        if (data && typeof data === 'object' && 'success' in data) {
          return {
            ...data,
            timestamp: new Date().toISOString(),
          };
        }

        // 包装成功响应
        const apiResponse: ApiResponse<T> = {
          success: true,
          data,
          timestamp: new Date().toISOString(),
        };

        // 如果有消息，添加到响应中（例如创建成功消息）
        if (data && typeof data === 'object' && 'message' in data) {
          const dataObj = data as any;
          apiResponse.message = dataObj.message;
          if (apiResponse.data && typeof apiResponse.data === 'object') {
            delete (apiResponse.data as any).message;
          }
        }

        return apiResponse;
      }),
    );
  }
}
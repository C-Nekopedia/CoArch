import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // 添加自定义认证逻辑，如检查令牌黑名单等
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // 可以在此处抛出自定义异常
    if (err || !user) {
      throw err || new Error('未授权访问');
    }
    return user;
  }
}

import {
  Controller,
  Get,
  Param,
  Res,
  HttpException,
  HttpStatus,
  Header,
  Query,
} from '@nestjs/common';
import { Response } from 'express';
import axios from 'axios';

@Controller('proxy')
export class ImageProxyController {
  private readonly BILIBILI_REFERER = 'https://www.bilibili.com';
  private readonly USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

  @Get('image')
  @Header('Cache-Control', 'public, max-age=86400')
  async proxyImage(@Query('url') encodedUrl: string, @Res() res: Response) {
    console.log('代理请求收到，encodedUrl:', encodedUrl);
    try {
      // 解码Base64编码的URL（前端使用encodeURIComponent编码）
      console.log('解码前:', encodedUrl);
      const imageUrl = decodeURIComponent(Buffer.from(encodedUrl, 'base64').toString('utf-8'));
      console.log('解码后图片URL:', imageUrl);

      // 验证URL，只允许B站图片
      if (!this.isValidBilibiliImageUrl(imageUrl)) {
        throw new HttpException('仅支持B站图片代理', HttpStatus.FORBIDDEN);
      }

      // 请求原始图片（强制获取最新图片，避免缓存）
      const response = await axios.get(imageUrl, {
        responseType: 'stream',
        headers: {
          'User-Agent': this.USER_AGENT,
          'Referer': this.BILIBILI_REFERER,
          'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        timeout: 10000,
      });

      // 设置响应头
      res.set({
        'Content-Type': response.headers['content-type'] || 'image/jpeg',
        'Content-Length': response.headers['content-length'],
        'Cache-Control': 'public, max-age=86400', // 缓存24小时
      });

      // 强制返回200状态码，确保图片数据正常传输
      res.status(200);

      // 管道传输图片数据
      response.data.pipe(res);
    } catch (error) {
      console.error('图片代理失败:', error.message);

      if (error.response) {
        throw new HttpException(
          `上游服务器错误: ${error.response.status}`,
          HttpStatus.BAD_GATEWAY
        );
      }

      throw new HttpException(
        '图片代理服务暂时不可用',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * 验证是否为合法的B站图片URL
   */
  private isValidBilibiliImageUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);

      // 允许的B站图片域名
      const allowedDomains = [
        'i0.hdslb.com',
        'i1.hdslb.com',
        'i2.hdslb.com',
        's1.hdslb.com',
        's2.hdslb.com',
        's3.hdslb.com',
      ];

      // 检查域名是否在白名单中
      if (!allowedDomains.includes(parsedUrl.hostname)) {
        return false;
      }

      // 检查路径是否包含 /bfs/ (B站图片路径)
      if (!parsedUrl.pathname.includes('/bfs/')) {
        return false;
      }

      // 检查文件扩展名
      const validExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const extension = parsedUrl.pathname.toLowerCase();
      return validExtensions.some(ext => extension.endsWith(ext));
    } catch {
      return false;
    }
  }

  /**
   * 安全地将URL编码为Base64
   */
  static encodeUrl(url: string): string {
    return Buffer.from(url).toString('base64');
  }
}
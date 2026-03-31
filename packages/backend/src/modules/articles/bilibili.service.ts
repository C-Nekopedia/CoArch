import { Injectable, BadRequestException } from '@nestjs/common';
import axios from 'axios';

export interface BilibiliVideoInfo {
  bvid?: string;
  aid?: number;
  title: string;
  cover: string;
  duration: number; // 秒数
  durationFormatted: string; // 格式化时长 HH:MM:SS 或 MM:SS
  author: string;
  viewCount: number;
  likeCount: number;
  danmakuCount: number;
}

@Injectable()
export class BilibiliService {
  private readonly BILIBILI_API_BASE = 'https://api.bilibili.com/x/web-interface/view';
  private readonly BILIBILI_SHARE_URL_REGEX = /(?:https?:\/\/)?(?:www\.)?bilibili\.com\/video\/(?:BV([a-zA-Z0-9]+)|av(\d+))/i;

  /**
   * 从B站分享链接中提取视频ID
   */
  extractVideoId(url: string): { bvid?: string; aid?: number } {
    const match = url.match(this.BILIBILI_SHARE_URL_REGEX);
    if (!match) {
      throw new BadRequestException('无效的B站视频链接');
    }

    if (match[1]) {
      // BV号
      return { bvid: `BV${match[1]}` };
    } else if (match[2]) {
      // av号
      return { aid: parseInt(match[2], 10) };
    }

    throw new BadRequestException('无法从链接中提取视频ID');
  }

  /**
   * 获取B站视频信息
   * 注意：B站API有访问频率限制，生产环境需要考虑缓存和代理
   */
  async getVideoInfo(url: string): Promise<BilibiliVideoInfo> {
    try {
      const { bvid, aid } = this.extractVideoId(url);

      // 构建API请求URL
      let apiUrl = this.BILIBILI_API_BASE;
      if (bvid) {
        apiUrl += `?bvid=${bvid}`;
      } else if (aid) {
        apiUrl += `?aid=${aid}`;
      }

      // 调用B站API
      const response = await axios.get(apiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': 'https://www.bilibili.com',
        },
        timeout: 10000,
      });

      const { code, data, message } = response.data;

      if (code !== 0 || !data) {
        throw new Error(`B站API错误: ${message || '未知错误'}`);
      }

      // 格式化时长（秒转 HH:MM:SS 或 MM:SS）
      const durationFormatted = this.formatDuration(data.duration);

      return {
        bvid: data.bvid,
        aid: data.aid,
        title: data.title,
        cover: data.pic,
        duration: data.duration,
        durationFormatted,
        author: data.owner?.name || '未知作者',
        viewCount: data.stat?.view || 0,
        likeCount: data.stat?.like || 0,
        danmakuCount: data.stat?.danmaku || 0,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // API调用失败时，返回基本信息和错误提示
      console.warn(`B站API调用失败: ${error.message}`);

      // 尝试提取视频ID，返回基本信息（降级方案）
      try {
        const { bvid, aid } = this.extractVideoId(url);
        return {
          bvid,
          aid,
          title: 'B站视频（信息获取失败）',
          cover: '',
          duration: 0,
          durationFormatted: '00:00',
          author: '未知作者',
          viewCount: 0,
          likeCount: 0,
          danmakuCount: 0,
        };
      } catch {
        throw new BadRequestException('无效的B站视频链接');
      }
    }
  }

  /**
   * 验证B站链接格式
   */
  validateBilibiliUrl(url: string): boolean {
    return this.BILIBILI_SHARE_URL_REGEX.test(url);
  }

  /**
   * 格式化时长（秒转 HH:MM:SS 或 MM:SS）
   */
  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  }

  /**
   * 从时长字符串解析秒数
   */
  parseDuration(durationStr: string): number {
    const parts = durationStr.split(':').map(part => parseInt(part, 10));

    if (parts.length === 3) {
      // HH:MM:SS
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      // MM:SS
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      // SS
      return parts[0];
    }

    throw new BadRequestException('无效的时长格式，请使用 HH:MM:SS 或 MM:SS 格式');
  }
}
/**
 * 图片处理工具函数
 */

// API基础URL，与api.ts保持一致
const API_BASE_URL = '/api/v1' // 硬编码使用Vite代理路径

/**
 * 是否为B站图片URL
 */
export function isBilibiliImageUrl(url: string): boolean {
  if (!url) return false;

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    // B站图片域名
    const bilibiliDomains = [
      'i0.hdslb.com',
      'i1.hdslb.com',
      'i2.hdslb.com',
      's1.hdslb.com',
      's2.hdslb.com',
      's3.hdslb.com',
    ];

    return bilibiliDomains.includes(hostname);
  } catch {
    return false;
  }
}

/**
 * 将图片URL转换为代理URL
 * 用于解决B站图片403防盗链问题
 */
export function toProxyUrl(url: string): string {
  if (!url) return '';

  // 如果不是B站图片，直接返回原URL
  if (!isBilibiliImageUrl(url)) {
    return url;
  }

  // 编码URL为Base64，避免特殊字符问题
  // 先使用encodeURIComponent确保URL安全，再Base64编码
  const encodedUrl = btoa(encodeURIComponent(url));

  // 返回完整代理URL，避免Vite开发服务器处理代理请求
  // 对Base64编码的URL进行URL编码，确保特殊字符安全
  const safeEncodedUrl = encodeURIComponent(encodedUrl);
  return `${API_BASE_URL}/proxy/image?url=${safeEncodedUrl}`;
}

/**
 * 批量转换文章列表中的封面URL
 */
export function convertArticleCovers(articles: any[]): any[] {
  if (!Array.isArray(articles)) return articles;

  return articles.map(article => ({
    ...article,
    cover: toProxyUrl(article.cover || ''),
  }));
}
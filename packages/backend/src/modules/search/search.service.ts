import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { SearchQueryDto } from './dto/search-query.dto';

export interface SearchResultItem {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover: string | null;
  type: 'article' | 'video';
  duration: string | null;
  bilibiliUrl: string | null;
  tags: string[];
  category: string | null;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date;
  userId: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  relevanceScore?: number;
  isLiked?: boolean;
}

export interface SearchResults {
  items: SearchResultItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  suggestions?: string[];
}

@Injectable()
export class SearchService {
  // 是否启用PostgreSQL全文搜索
  private readonly useFullTextSearch = true;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 全局搜索（文章/视频）
   */
  async search(
    searchQueryDto: SearchQueryDto,
    currentUserId?: string,
  ): Promise<SearchResults> {
    const {
      q,
      page = 1,
      pageSize = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      type = 'all',
      category,
      tag,
      author,
    } = searchQueryDto;

    const skip = (page - 1) * pageSize;

    // 构建基础查询条件
    const where: any = {
      deletedAt: null,
    };

    // 类型过滤
    if (type !== 'all') {
      where.type = type;
    }

    // 分类过滤
    if (category) {
      where.category = category;
    }

    // 标签过滤
    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    // 作者过滤
    if (author) {
      // 通过用户名查找用户ID
      const user = await this.prisma.user.findUnique({
        where: { username: author, deletedAt: null },
        select: { id: true },
      });

      if (user) {
        where.userId = user.id;
      } else {
        // 如果用户不存在，返回空结果
        return {
          items: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false,
          },
          suggestions: this.generateSuggestions(q),
        };
      }
    }

    // 搜索条件（多字段搜索）
    if (q && q.trim()) {
      const searchTerm = q.trim();
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { content: { contains: searchTerm, mode: 'insensitive' } },
        { excerpt: { contains: searchTerm, mode: 'insensitive' } },
        { tags: { has: searchTerm } }, // 标签精确匹配
        { category: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // 获取总数
    const total = await this.prisma.article.count({ where });

    // 构建排序
    let orderBy: any = {};

    if (sortBy === 'relevance') {
      // 相关度排序（按标题匹配优先）
      // 这里使用简单实现：标题匹配 > 内容匹配 > 其他
      // 在实际应用中，可以使用更复杂的算法或PostgreSQL全文搜索
      if (q && q.trim()) {
        // 对于相关度排序，我们使用复合排序：
        // 1. 首先按标题是否包含关键词（标题匹配的优先级最高）
        // 2. 然后按浏览量
        // 3. 最后按创建时间
        // 注意：Prisma不支持条件排序，所以我们稍后会在内存中按相关度分数排序
        orderBy = [{ viewsCount: sortOrder }, { createdAt: 'desc' }];
      } else {
        // 没有搜索词时，按时间倒序
        orderBy = { createdAt: 'desc' };
      }
    } else {
      // 其他字段排序
      orderBy[sortBy] = sortOrder;
    }

    // 获取文章列表
    const articles = await this.prisma.article.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: Array.isArray(orderBy) ? orderBy : orderBy,
    });

    // 获取当前用户的点赞状态并计算相关度分数
    const items = await Promise.all(
      articles.map(async (article) => {
        let isLiked = false;
        if (currentUserId) {
          const like = await this.prisma.articleLike.findUnique({
            where: {
              userId_articleId: {
                userId: currentUserId,
                articleId: article.id,
              },
            },
          });
          isLiked = !!like;
        }

        // 计算简单相关度分数
        let relevanceScore = 0;
        if (q && q.trim()) {
          const searchTerm = q.trim().toLowerCase();

          // 标题匹配权重最高
          if (article.title.toLowerCase().includes(searchTerm)) {
            relevanceScore += 10;
          }

          // 内容匹配权重中等
          if (article.content.toLowerCase().includes(searchTerm)) {
            relevanceScore += 3;
          }

          // 摘要匹配权重中等
          if (
            article.excerpt &&
            article.excerpt.toLowerCase().includes(searchTerm)
          ) {
            relevanceScore += 3;
          }

          // 标签精确匹配权重高
          if (article.tags.includes(searchTerm)) {
            relevanceScore += 8;
          }

          // 分类匹配权重中等
          if (
            article.category &&
            article.category.toLowerCase().includes(searchTerm)
          ) {
            relevanceScore += 4;
          }
        }

        return {
          id: article.id,
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          cover: article.cover,
          type: article.type as 'article' | 'video',
          duration: article.duration,
          bilibiliUrl: article.bilibiliUrl,
          tags: article.tags,
          category: article.category,
          viewsCount: article.viewsCount,
          likesCount: article.likesCount,
          commentsCount: article.commentsCount,
          createdAt: article.createdAt,
          updatedAt: article.updatedAt,
          publishedAt: article.publishedAt,
          userId: article.userId,
          user: article.user,
          relevanceScore,
          isLiked,
        };
      }),
    );

    // 如果按相关度排序且有关键词，按相关度分数排序
    if (sortBy === 'relevance' && q && q.trim()) {
      items.sort((a, b) => {
        if (sortOrder === 'desc') {
          return b.relevanceScore! - a.relevanceScore!;
        } else {
          return a.relevanceScore! - b.relevanceScore!;
        }
      });
    }

    // 生成搜索建议
    const suggestions = this.generateSuggestions(q);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasNext: page * pageSize < total,
        hasPrev: page > 1,
      },
      suggestions,
    };
  }

  /**
   * 搜索建议（热门标签、分类、作者等）
   */
  async getSearchSuggestions(query: string): Promise<{
    tags: string[];
    categories: string[];
    authors: string[];
  }> {
    const suggestions = {
      tags: [],
      categories: [],
      authors: [],
    } as {
      tags: string[];
      categories: string[];
      authors: string[];
    };

    if (!query || query.trim().length < 2) {
      return suggestions;
    }

    const searchTerm = query.trim().toLowerCase();

    try {
      // 获取匹配的标签
      const tagResults = await this.prisma.article.findMany({
        where: {
          deletedAt: null,
          tags: {
            hasSome: [searchTerm],
          },
        },
        select: {
          tags: true,
        },
        take: 10,
      });

      // 提取标签并去重
      const allTags: string[] = tagResults.flatMap((article) => article.tags);
      suggestions.tags = [...new Set(allTags)]
        .filter((tag) => tag.toLowerCase().includes(searchTerm))
        .slice(0, 10);

      // 获取匹配的分类
      const categoryResults = await this.prisma.article.findMany({
        where: {
          deletedAt: null,
          category: {
            contains: searchTerm,
            mode: 'insensitive',
          },
        },
        select: {
          category: true,
        },
        distinct: ['category'],
        take: 10,
      });

      suggestions.categories = categoryResults
        .filter((result) => result.category !== null)
        .map((result) => result.category!)
        .slice(0, 10);

      // 获取匹配的作者
      const authorResults = await this.prisma.article.findMany({
        where: {
          deletedAt: null,
          user: {
            username: {
              contains: searchTerm,
              mode: 'insensitive',
            },
            deletedAt: null,
          },
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
        },
        distinct: ['userId'],
        take: 10,
      });

      suggestions.authors = authorResults
        .map((result) => result.user.username)
        .slice(0, 10);
    } catch (error) {
      console.error('获取搜索建议失败:', error);
    }

    return suggestions;
  }

  /**
   * 热门搜索关键词
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    // 这里可以集成Redis或数据库来存储热门搜索
    // 简化实现：返回一些预定义的热门关键词
    return [
      '技术',
      '编程',
      'JavaScript',
      'TypeScript',
      'Node.js',
      'Vue',
      'React',
      '后端开发',
      '前端开发',
      '数据库',
    ].slice(0, limit);
  }

  /**
   * 生成搜索建议
   */
  private generateSuggestions(query?: string): string[] {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    const suggestions: string[] = [];

    // 添加相关建议
    if (searchTerm.includes('技术')) {
      suggestions.push('编程', '开发', '代码');
    }
    if (searchTerm.includes('编程')) {
      suggestions.push('代码', '开发', '算法');
    }
    if (searchTerm.includes('前端')) {
      suggestions.push('Vue', 'React', 'JavaScript');
    }
    if (searchTerm.includes('后端')) {
      suggestions.push('Node.js', '数据库', 'API');
    }
    if (searchTerm.includes('视频')) {
      suggestions.push('B站', '教程', '演示');
    }

    // 添加原始搜索词的各种变体
    suggestions.push(
      `${searchTerm} 教程`,
      `${searchTerm} 入门`,
      `${searchTerm} 高级`,
    );

    return suggestions.slice(0, 5);
  }

  /**
   * 检查搜索是否有效
   */
  validateSearchQuery(query: string): { isValid: boolean; reason?: string } {
    if (!query || query.trim().length === 0) {
      return { isValid: false, reason: '搜索关键词不能为空' };
    }

    const trimmedQuery = query.trim();

    if (trimmedQuery.length < 2) {
      return { isValid: false, reason: '搜索关键词至少需要2个字符' };
    }

    if (trimmedQuery.length > 100) {
      return { isValid: false, reason: '搜索关键词不能超过100个字符' };
    }

    // 检查是否包含特殊字符（可选）
    const specialChars = /[<>{}[\]\\]/;
    if (specialChars.test(trimmedQuery)) {
      return { isValid: false, reason: '搜索关键词包含无效字符' };
    }

    return { isValid: true };
  }
}

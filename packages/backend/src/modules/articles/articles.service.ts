import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/browser';
import { RedisService } from '../../shared/redis/redis.service';
import { LoggerService } from '../../shared/logger/logger.service';
import { BilibiliService } from './bilibili.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { GetArticlesQueryDto } from './dto/get-articles-query.dto';

export interface ArticleResponse {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  cover: string | null;
  type: 'article' | 'video';
  duration: string | null;
  bilibiliUrl: string | null;
  bvid: string | null; // 新增：从bilibiliUrl中提取的BV号
  bilibiliViewCount: number; // B站播放量
  bilibiliLikeCount: number; // B站点赞量
  bilibiliDanmakuCount: number; // B站弹幕数
  bilibiliAuthor: string | null; // B站视频作者
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
  isLiked?: boolean;
}

export interface PaginatedArticles {
  items: ArticleResponse[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class ArticlesService {
  constructor(
    private readonly prisma: PrismaService,
    @Optional() private readonly redis: RedisService,
    @Optional() private readonly logger: LoggerService,
    private readonly bilibiliService: BilibiliService,
  ) {
    if (this.logger) {
      this.logger.setContext('ArticlesService');
    }
  }

  private isRedisAvailable(): boolean {
    return !!this.redis;
  }

  /**
   * 创建文章或视频
   */
  async createArticle(
    userId: string,
    createArticleDto: CreateArticleDto,
  ): Promise<ArticleResponse> {
    // 提取摘要（如果未提供）
    try {
      this.logger.debug(
        `开始创建文章，用户ID: ${userId}, 类型: ${createArticleDto.type}`,
      );
      let excerpt = createArticleDto.excerpt;
      if (!excerpt && createArticleDto.content) {
        excerpt = createArticleDto.content.substring(0, 200).trim() + '...';
      }

      // 处理标签（确保是字符串数组）
      const tags = createArticleDto.tags || [];

      // 如果是视频类型且有B站链接，尝试获取视频信息
      let duration = createArticleDto.duration;
      let cover = createArticleDto.cover;
      let bilibiliViewCount = 0;
      let bilibiliLikeCount = 0;
      let bilibiliDanmakuCount = 0;
      let bilibiliAuthor: string | null = null;

      if (createArticleDto.type === 'video' && createArticleDto.bilibiliUrl) {
        try {
          const videoInfo = await this.bilibiliService.getVideoInfo(
            createArticleDto.bilibiliUrl,
          );

          // 如果用户没有提供时长，使用从B站获取的时长
          if (!duration && videoInfo.durationFormatted) {
            duration = videoInfo.durationFormatted;
          }

          // 如果用户没有提供封面，使用从B站获取的封面
          if (!cover && videoInfo.cover) {
            cover = videoInfo.cover;
          }

          // 保存B站视频元数据
          bilibiliViewCount = videoInfo.viewCount;
          bilibiliLikeCount = videoInfo.likeCount;
          bilibiliDanmakuCount = videoInfo.danmakuCount;
          bilibiliAuthor = videoInfo.author;
        } catch (error) {
          // 记录错误但不阻止创建，使用用户提供的其他信息
          this.logger.warn(`获取B站视频信息失败: ${error.message}`);
        }
      }

      // 创建文章
      this.logger.debug(
        `准备创建数据库记录，类型: ${createArticleDto.type}, 标签数: ${tags.length}`,
      );

      const article = await this.prisma.article.create({
        data: {
          title: createArticleDto.title,
          content: createArticleDto.content,
          excerpt,
          cover,
          type: createArticleDto.type,
          duration,
          bilibiliUrl: createArticleDto.bilibiliUrl,
          bilibiliViewCount,
          bilibiliLikeCount,
          bilibiliDanmakuCount,
          bilibiliAuthor,
          tags,
          category: createArticleDto.category,
          userId,
          publishedAt: new Date(),
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      // 更新用户的文章/视频计数
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          [createArticleDto.type === 'article' ? 'articleCount' : 'videoCount']:
            {
              increment: 1,
            },
        },
      });

      this.logger.debug(
        `数据库记录创建成功，文章ID: ${article.id}, 用户计数更新完成`,
      );

      return this.mapToArticleResponse(article);
    } catch (error) {
      this.logger.error(`创建文章失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 根据ID获取文章详情（带缓存）
   */
  async getArticleById(
    id: string,
    currentUserId?: string,
  ): Promise<ArticleResponse> {
    const cacheKey = `article:${id}`;
    const userLikeKey = currentUserId
      ? `article:${id}:like:${currentUserId}`
      : null;

    try {
      // 检查Redis是否可用
      if (this.isRedisAvailable()) {
        // 尝试从缓存获取文章数据
        const cachedArticle = await this.redis.get<ArticleResponse>(cacheKey);
        if (cachedArticle) {
          this.logger.debug(`从缓存获取文章 ${id}`);

          // 检查点赞状态（如果需要）
          if (currentUserId) {
            const cachedLike = await this.redis.get<boolean>(userLikeKey!);
            if (cachedLike !== null) {
              cachedArticle.isLiked = cachedLike;
            } else {
              // 缓存中没有点赞状态，从数据库获取
              const isLiked = await this.checkLikeStatus(id, currentUserId);
              cachedArticle.isLiked = isLiked;
              // 缓存点赞状态（短期缓存，5分钟）
              await this.redis.set(userLikeKey!, isLiked, 5 * 60 * 1000);
            }
          }

          return cachedArticle;
        }

        this.logger.debug(`缓存未命中，从数据库获取文章 ${id}`);
      }

      // 从数据库获取文章
      const article = await this.prisma.article.findUnique({
        where: {
          id,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatar: true,
            },
          },
        },
      });

      if (!article) {
        throw new NotFoundException('内容不存在');
      }

      // 检查当前用户是否点赞
      let isLiked = false;
      if (currentUserId) {
        isLiked = await this.checkLikeStatus(id, currentUserId);
        // 缓存点赞状态（如果Redis可用）
        if (this.isRedisAvailable()) {
          await this.redis.set(userLikeKey!, isLiked, 5 * 60 * 1000);
        }
      }

      // 转换为响应格式
      const articleResponse = {
        ...this.mapToArticleResponse(article),
        isLiked,
      };

      // 缓存文章数据（默认60分钟，如果Redis可用）
      if (this.isRedisAvailable()) {
        await this.redis.set(cacheKey, articleResponse, 60 * 60 * 1000);
        this.logger.debug(`文章 ${id} 已缓存`);
      }

      this.logger.debug(`文章 ${id} 已缓存`);

      return articleResponse;
    } catch (error) {
      this.logger.error(`获取文章详情失败 ${id}`, error);
      throw error;
    }
  }

  /**
   * 更新文章
   */
  async updateArticle(
    id: string,
    userId: string,
    updateArticleDto: UpdateArticleDto,
  ): Promise<ArticleResponse> {
    // 检查文章是否存在且属于当前用户
    const article = await this.prisma.article.findUnique({
      where: { id, deletedAt: null },
    });

    if (!article) {
      throw new NotFoundException('内容不存在');
    }

    if (article.userId !== userId) {
      throw new ForbiddenException('无权修改此内容');
    }

    // 处理标签（如果提供）
    const tags =
      updateArticleDto.tags !== undefined
        ? updateArticleDto.tags
        : article.tags;

    // 更新文章
    const updatedArticle = await this.prisma.article.update({
      where: { id },
      data: {
        title: updateArticleDto.title,
        content: updateArticleDto.content,
        excerpt: updateArticleDto.excerpt,
        cover: updateArticleDto.cover,
        tags,
        category: updateArticleDto.category,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    // 清除文章缓存（如果Redis可用）
    if (this.isRedisAvailable()) {
      await this.redis.del(`article:${id}`);
      this.logger.debug(`文章 ${id} 缓存已清除（更新后）`);
    }

    return this.mapToArticleResponse(updatedArticle);
  }

  /**
   * 删除文章（软删除）
   */
  async deleteArticle(id: string, userId: string): Promise<void> {
    // 检查文章是否存在且属于当前用户
    const article = await this.prisma.article.findUnique({
      where: { id, deletedAt: null },
    });

    if (!article) {
      throw new NotFoundException('内容不存在');
    }

    if (article.userId !== userId) {
      throw new ForbiddenException('无权删除此内容');
    }

    // 软删除
    await this.prisma.article.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // 更新用户的文章/视频计数
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        [article.type === 'article' ? 'articleCount' : 'videoCount']: {
          decrement: 1,
        },
      },
    });

    // 清除文章缓存（如果Redis可用）
    if (this.isRedisAvailable()) {
      await this.redis.del(`article:${id}`);
      this.logger.debug(`文章 ${id} 缓存已清除（删除后）`);
    }
  }

  /**
   * 获取文章列表（支持分页、筛选、排序）
   */
  async getArticles(
    query: GetArticlesQueryDto,
    currentUserId?: string,
  ): Promise<PaginatedArticles> {
    const {
      page = 1,
      pageSize = 20,
      type,
      author,
      category,
      tag,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (Number(page) - 1) * Number(pageSize);

    // 构建查询条件
    const where: Prisma.ArticleWhereInput = {
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

    if (category) {
      where.category = category;
    }

    if (tag) {
      where.tags = {
        has: tag,
      };
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

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
        };
      }
    }

    // 排序
    const orderBy: Prisma.ArticleOrderByWithRelationInput = {};
    (orderBy as Record<string, 'asc' | 'desc'>)[sortBy] = sortOrder;

    // 获取总数
    const total = await this.prisma.article.count({ where });

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
      take: Number(pageSize),
      orderBy,
    });

    // 获取当前用户的点赞状态
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

        return {
          ...this.mapToArticleResponse(article),
          isLiked,
        };
      }),
    );

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
    };
  }

  /**
   * 点赞文章
   */
  async likeArticle(
    articleId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    // 检查文章是否存在
    const article = await this.prisma.article.findUnique({
      where: { id: articleId, deletedAt: null },
    });

    if (!article) {
      throw new NotFoundException('内容不存在');
    }

    // 检查是否已经点赞
    const existingLike = await this.prisma.articleLike.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    if (existingLike) {
      throw new ConflictException('已经点赞过该内容');
    }

    // 使用事务确保计数器更新的一致性
    await this.prisma.$transaction(async (tx) => {
      // 创建点赞关系
      await tx.articleLike.create({
        data: {
          userId,
          articleId,
        },
      });

      // 更新文章点赞数
      await tx.article.update({
        where: { id: articleId },
        data: {
          likesCount: { increment: 1 },
        },
      });
    });

    // 获取更新后的点赞数
    const updatedArticle = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { likesCount: true },
    });

    // 清除文章缓存和点赞状态缓存（如果Redis可用）
    if (this.isRedisAvailable()) {
      await this.redis.del(`article:${articleId}`);
      await this.redis.del(`article:${articleId}:like:${userId}`);
      this.logger.debug(`文章 ${articleId} 缓存已清除（点赞后）`);
    }

    return {
      isLiked: true,
      likesCount: updatedArticle?.likesCount || 0,
    };
  }

  /**
   * 取消点赞文章
   */
  async unlikeArticle(
    articleId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    // 检查文章是否存在
    const article = await this.prisma.article.findUnique({
      where: { id: articleId, deletedAt: null },
    });

    if (!article) {
      throw new NotFoundException('内容不存在');
    }

    // 检查是否已经点赞
    const existingLike = await this.prisma.articleLike.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    if (!existingLike) {
      throw new ConflictException('尚未点赞该内容');
    }

    // 使用事务确保计数器更新的一致性
    await this.prisma.$transaction(async (tx) => {
      // 删除点赞关系
      await tx.articleLike.delete({
        where: {
          userId_articleId: {
            userId,
            articleId,
          },
        },
      });

      // 更新文章点赞数
      await tx.article.update({
        where: { id: articleId },
        data: {
          likesCount: { decrement: 1 },
        },
      });
    });

    // 获取更新后的点赞数
    const updatedArticle = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { likesCount: true },
    });

    // 清除文章缓存和点赞状态缓存（如果Redis可用）
    if (this.isRedisAvailable()) {
      await this.redis.del(`article:${articleId}`);
      await this.redis.del(`article:${articleId}:like:${userId}`);
      this.logger.debug(`文章 ${articleId} 缓存已清除（取消点赞后）`);
    }

    return {
      isLiked: false,
      likesCount: updatedArticle?.likesCount || 0,
    };
  }

  /**
   * 增加文章浏览量
   */
  async incrementViewCount(articleId: string): Promise<void> {
    await this.prisma.article.update({
      where: { id: articleId, deletedAt: null },
      data: {
        viewsCount: { increment: 1 },
      },
    });
  }

  /**
   * 检查用户是否点赞了文章（带缓存）
   */
  async checkLikeStatus(articleId: string, userId: string): Promise<boolean> {
    const cacheKey = `article:${articleId}:like:${userId}`;

    // 如果Redis可用，尝试从缓存获取
    if (this.isRedisAvailable()) {
      const cachedLike = await this.redis.get<boolean>(cacheKey);
      if (cachedLike !== null) {
        return cachedLike;
      }
    }

    // 从数据库获取
    const like = await this.prisma.articleLike.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    const isLiked = !!like;

    // 缓存结果（5分钟，如果Redis可用）
    if (this.isRedisAvailable()) {
      await this.redis.set(cacheKey, isLiked, 5 * 60 * 1000);
    }

    return isLiked;
  }

  /**
   * 将Prisma文章对象映射到响应格式
   */
  private mapToArticleResponse(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    article: any,
  ): ArticleResponse {
    // 提取B站视频BV号（如果有bilibiliUrl）
    let bvid: string | null = null;
    if (article.bilibiliUrl) {
      try {
        const videoId = this.bilibiliService.extractVideoId(
          article.bilibiliUrl,
        );
        bvid = videoId.bvid || null;
      } catch {
        // 如果URL无效或无法提取，保持bvid为null
        bvid = null;
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
      bvid, // 新增：提取的BV号
      bilibiliViewCount: article.bilibiliViewCount || 0,
      bilibiliLikeCount: article.bilibiliLikeCount || 0,
      bilibiliDanmakuCount: article.bilibiliDanmakuCount || 0,
      bilibiliAuthor: article.bilibiliAuthor || null,
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
    };
  }
}

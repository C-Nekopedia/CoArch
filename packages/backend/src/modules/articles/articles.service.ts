import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
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
    private readonly bilibiliService: BilibiliService,
  ) {}

  /**
   * 创建文章或视频
   */
  async createArticle(userId: string, createArticleDto: CreateArticleDto): Promise<ArticleResponse> {
    console.log('[createArticle] 开始创建文章，用户ID:', userId)
    console.log('[createArticle] 文章数据:', JSON.stringify(createArticleDto, null, 2))

    // 提取摘要（如果未提供）
    try {
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
        const videoInfo = await this.bilibiliService.getVideoInfo(createArticleDto.bilibiliUrl);

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
        console.warn(`获取B站视频信息失败: ${error.message}`);
      }
    }

    // 创建文章
    console.log('[createArticle] 准备创建数据库记录，类型:', createArticleDto.type)
    console.log('[createArticle] 标签:', tags)
    console.log('[createArticle] 封面:', cover)
    console.log('[createArticle] 时长:', duration)

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
        [createArticleDto.type === 'article' ? 'articleCount' : 'videoCount']: {
          increment: 1,
        },
      },
    });

    console.log('[createArticle] 数据库记录创建成功，文章ID:', article.id)
    console.log('[createArticle] 用户计数更新完成')

    return this.mapToArticleResponse(article);
  } catch (error) {
    console.error('[createArticle] 捕获到错误:', error);
    console.error('[createArticle] 错误堆栈:', error.stack);
    throw error;
  }
  }

  /**
   * 根据ID获取文章详情
   */
  async getArticleById(id: string, currentUserId?: string): Promise<ArticleResponse> {
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
      const like = await this.prisma.articleLike.findUnique({
        where: {
          userId_articleId: {
            userId: currentUserId,
            articleId: id,
          },
        },
      });
      isLiked = !!like;
    }

    return {
      ...this.mapToArticleResponse(article),
      isLiked,
    };
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
    const tags = updateArticleDto.tags !== undefined ? updateArticleDto.tags : article.tags;

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
  }

  /**
   * 获取文章列表（支持分页、筛选、排序）
   */
  async getArticles(query: GetArticlesQueryDto, currentUserId?: string): Promise<PaginatedArticles> {
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

    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: any = {
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
    const orderBy: any = {};
    orderBy[sortBy] = sortOrder;

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
      take: pageSize,
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
  async likeArticle(articleId: string, userId: string): Promise<{ isLiked: boolean; likesCount: number }> {
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

    return {
      isLiked: true,
      likesCount: updatedArticle?.likesCount || 0,
    };
  }

  /**
   * 取消点赞文章
   */
  async unlikeArticle(articleId: string, userId: string): Promise<{ isLiked: boolean; likesCount: number }> {
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
   * 检查用户是否点赞了文章
   */
  async checkLikeStatus(articleId: string, userId: string): Promise<boolean> {
    const like = await this.prisma.articleLike.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    });

    return !!like;
  }

  /**
   * 将Prisma文章对象映射到响应格式
   */
  private mapToArticleResponse(article: any): ArticleResponse {
    // 提取B站视频BV号（如果有bilibiliUrl）
    let bvid: string | null = null;
    if (article.bilibiliUrl) {
      try {
        const videoId = this.bilibiliService.extractVideoId(article.bilibiliUrl);
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
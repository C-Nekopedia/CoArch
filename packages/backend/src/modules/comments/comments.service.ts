import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { Prisma } from '../../generated/prisma/browser';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

export interface CommentResponse {
  id: string;
  content: string;
  likesCount: number;
  createdAt: Date;
  updatedAt: Date;
  depth: number;
  articleId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    avatar: string | null;
  };
  parentId?: string | null;
  replies?: CommentResponse[];
  isLiked?: boolean;
  deletedAt?: Date | null;
}

export interface PaginatedComments {
  items: CommentResponse[];
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
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建评论
   */
  async createComment(
    articleId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentResponse> {
    // 检查文章是否存在
    const article = await this.prisma.article.findUnique({
      where: { id: articleId, deletedAt: null },
    });

    if (!article) {
      throw new NotFoundException('内容不存在');
    }

    let parentComment: Prisma.CommentGetPayload<{}> | null = null;
    let depth = 1;

    // 如果指定了父评论，检查父评论并计算深度
    if (createCommentDto.parentId) {
      parentComment = await this.prisma.comment.findUnique({
        where: {
          id: createCommentDto.parentId,
          deletedAt: null,
        },
      });

      if (!parentComment) {
        throw new NotFoundException('父评论不存在');
      }

      // 确保父评论属于同一篇文章
      if (parentComment.articleId !== articleId) {
        throw new BadRequestException('父评论不属于当前文章');
      }

      // 计算深度（父评论深度 + 1）
      depth = parentComment.depth + 1;

      // 限制评论最大深度为3级
      if (depth > 3) {
        throw new BadRequestException('评论层级太深，最多支持3级嵌套评论');
      }
    }

    // 使用事务确保评论计数器的正确性
    const comment = await this.prisma.$transaction(async (tx) => {
      // 创建评论
      const newComment = await tx.comment.create({
        data: {
          content: createCommentDto.content,
          articleId,
          userId,
          parentId: createCommentDto.parentId || null,
          depth,
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

      // 更新文章的评论数
      await tx.article.update({
        where: { id: articleId },
        data: {
          commentsCount: { increment: 1 },
        },
      });

      return newComment;
    });

    return this.mapToCommentResponse(comment);
  }

  /**
   * 根据ID获取评论详情
   */
  async getCommentById(
    commentId: string,
    currentUserId?: string,
  ): Promise<CommentResponse> {
    const comment = await this.prisma.comment.findUnique({
      where: {
        id: commentId,
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

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 检查当前用户是否点赞
    let isLiked = false;
    if (currentUserId) {
      const like = await this.prisma.commentLike.findUnique({
        where: {
          userId_commentId: {
            userId: currentUserId,
            commentId,
          },
        },
      });
      isLiked = !!like;
    }

    return {
      ...this.mapToCommentResponse(comment),
      isLiked,
    };
  }

  /**
   * 更新评论
   */
  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<CommentResponse> {
    // 检查评论是否存在且属于当前用户
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('无权修改此评论');
    }

    // 更新评论
    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: updateCommentDto.content,
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

    return this.mapToCommentResponse(updatedComment);
  }

  /**
   * 删除评论（软删除）
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    // 检查评论是否存在且属于当前用户
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('无权删除此评论');
    }

    // 使用事务确保评论计数器的正确性
    await this.prisma.$transaction(async (tx) => {
      // 软删除评论
      await tx.comment.update({
        where: { id: commentId },
        data: {
          deletedAt: new Date(),
        },
      });

      // 更新文章的评论数
      await tx.article.update({
        where: { id: comment.articleId },
        data: {
          commentsCount: { decrement: 1 },
        },
      });
    });
  }

  /**
   * 获取文章评论列表（支持分页）
   */
  async getArticleComments(
    articleId: string,
    page: number = 1,
    pageSize: number = 20,
    currentUserId?: string,
  ): Promise<PaginatedComments> {
    // 检查文章是否存在
    const article = await this.prisma.article.findUnique({
      where: { id: articleId, deletedAt: null },
    });

    if (!article) {
      throw new NotFoundException('内容不存在');
    }

    const skip = (page - 1) * pageSize;

    // 构建查询条件：获取顶级评论（depth=1）
    const where = {
      articleId,
      parentId: null,
      deletedAt: null,
    };

    // 获取顶级评论总数
    const total = await this.prisma.comment.count({ where });

    // 获取顶级评论列表
    const topLevelComments = await this.prisma.comment.findMany({
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
      orderBy: { createdAt: 'desc' },
    });

    // 获取当前用户的点赞状态并构建评论树
    const items = await Promise.all(
      topLevelComments.map(async (comment) => {
        return await this.buildCommentWithReplies(comment, currentUserId);
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
   * 构建评论树（包括回复）
   */
  private async buildCommentWithReplies(
    comment: Prisma.CommentGetPayload<{
      include: {
        user: {
          select: {
            id: true;
            username: true;
            avatar: true;
          };
        };
        replies?: {
          include: {
            user: {
              select: {
                id: true;
                username: true;
                avatar: true;
              };
            };
          };
        };
      };
    }>,
    currentUserId?: string,
  ): Promise<CommentResponse> {
    // 检查当前用户是否点赞
    let isLiked = false;
    if (currentUserId) {
      const like = await this.prisma.commentLike.findUnique({
        where: {
          userId_commentId: {
            userId: currentUserId,
            commentId: comment.id,
          },
        },
      });
      isLiked = !!like;
    }

    // 递归获取回复评论
    const replies = await this.getCommentReplies(comment.id, currentUserId);

    return {
      ...this.mapToCommentResponse(comment),
      isLiked,
      replies,
    };
  }

  /**
   * 获取评论的回复列表
   */
  private async getCommentReplies(
    parentId: string,
    currentUserId?: string,
  ): Promise<CommentResponse[]> {
    const replies = await this.prisma.comment.findMany({
      where: {
        parentId,
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
      orderBy: { createdAt: 'asc' },
    });

    // 递归获取更深层的回复
    const result = await Promise.all(
      replies.map(async (reply) => {
        return await this.buildCommentWithReplies(reply, currentUserId);
      }),
    );

    return result;
  }

  /**
   * 点赞评论
   */
  async likeComment(
    commentId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    // 检查评论是否存在
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 检查是否已经点赞
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      throw new ConflictException('已经点赞过该评论');
    }

    // 使用事务确保计数器更新的一致性
    await this.prisma.$transaction(async (tx) => {
      // 创建点赞关系
      await tx.commentLike.create({
        data: {
          userId,
          commentId,
        },
      });

      // 更新评论点赞数
      await tx.comment.update({
        where: { id: commentId },
        data: {
          likesCount: { increment: 1 },
        },
      });
    });

    // 获取更新后的点赞数
    const updatedComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { likesCount: true },
    });

    return {
      isLiked: true,
      likesCount: updatedComment?.likesCount || 0,
    };
  }

  /**
   * 取消点赞评论
   */
  async unlikeComment(
    commentId: string,
    userId: string,
  ): Promise<{ isLiked: boolean; likesCount: number }> {
    // 检查评论是否存在
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId, deletedAt: null },
    });

    if (!comment) {
      throw new NotFoundException('评论不存在');
    }

    // 检查是否已经点赞
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (!existingLike) {
      throw new ConflictException('尚未点赞该评论');
    }

    // 使用事务确保计数器更新的一致性
    await this.prisma.$transaction(async (tx) => {
      // 删除点赞关系
      await tx.commentLike.delete({
        where: {
          userId_commentId: {
            userId,
            commentId,
          },
        },
      });

      // 更新评论点赞数
      await tx.comment.update({
        where: { id: commentId },
        data: {
          likesCount: { decrement: 1 },
        },
      });
    });

    // 获取更新后的点赞数
    const updatedComment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      select: { likesCount: true },
    });

    return {
      isLiked: false,
      likesCount: updatedComment?.likesCount || 0,
    };
  }

  /**
   * 检查用户是否点赞了评论
   */
  async checkLikeStatus(commentId: string, userId: string): Promise<boolean> {
    const like = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    return !!like;
  }

  /**
   * 将Prisma评论对象映射到响应格式
   */
  private mapToCommentResponse(comment: any): CommentResponse {
    return {
      id: comment.id,
      content: comment.deletedAt ? '该评论已删除' : comment.content,
      likesCount: comment.likesCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      depth: comment.depth,
      articleId: comment.articleId,
      userId: comment.userId,
      user: comment.user,
      parentId: comment.parentId,
      deletedAt: comment.deletedAt,
    };
  }
}

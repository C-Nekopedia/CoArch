import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../shared/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ArticleResponse, PaginatedArticles } from '../articles/articles.service';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  articleCount: number;
  videoCount: number;
  isCreator: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface PublicUserProfile {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  followersCount: number;
  followingCount: number;
  articleCount: number;
  videoCount: number;
  isCreator: boolean;
  createdAt: Date;
}

export interface FollowStatus {
  isFollowing: boolean;
  followerCount: number;
  followingCount: number;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 根据用户名获取用户公开资料
   */
  async getUserProfile(username: string): Promise<PublicUserProfile> {
    const user = await this.prisma.user.findUnique({
      where: {
        username,
        deletedAt: null, // 排除已删除的用户
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        articleCount: true,
        videoCount: true,
        isCreator: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user;
  }

  /**
   * 获取当前用户的完整资料（需要认证）
   */
  async getCurrentUserProfile(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        articleCount: true,
        videoCount: true,
        isCreator: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return user as UserProfile;
  }

  /**
   * 更新当前用户资料
   */
  async updateUserProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfile> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        avatar: updateProfileDto.avatar,
        bio: updateProfileDto.bio,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        articleCount: true,
        videoCount: true,
        isCreator: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    });

    return updatedUser as UserProfile;
  }

  /**
   * 关注用户
   */
  async followUser(currentUserId: string, targetUsername: string): Promise<FollowStatus> {
    // 获取目标用户
    const targetUser = await this.prisma.user.findUnique({
      where: {
        username: targetUsername,
        deletedAt: null,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    // 不能关注自己
    if (currentUserId === targetUser.id) {
      throw new BadRequestException('不能关注自己');
    }

    // 检查是否已经关注
    const existingFollow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      },
    });

    if (existingFollow) {
      throw new ConflictException('已经关注该用户');
    }

    // 使用事务确保计数器更新的一致性
    await this.prisma.$transaction(async (tx) => {
      // 创建关注关系
      await tx.userFollow.create({
        data: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      });

      // 更新当前用户的关注数
      await tx.user.update({
        where: { id: currentUserId },
        data: {
          followingCount: { increment: 1 },
        },
      });

      // 更新目标用户的粉丝数
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          followersCount: { increment: 1 },
        },
      });
    });

    // 获取更新后的计数
    const [currentUser, targetUserUpdated] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { followingCount: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUser.id },
        select: { followersCount: true },
      }),
    ]);

    return {
      isFollowing: true,
      followerCount: targetUserUpdated?.followersCount || 0,
      followingCount: currentUser?.followingCount || 0,
    };
  }

  /**
   * 取消关注用户
   */
  async unfollowUser(currentUserId: string, targetUsername: string): Promise<FollowStatus> {
    // 获取目标用户
    const targetUser = await this.prisma.user.findUnique({
      where: {
        username: targetUsername,
        deletedAt: null,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    // 检查是否已经关注
    const existingFollow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      },
    });

    if (!existingFollow) {
      throw new ConflictException('尚未关注该用户');
    }

    // 使用事务确保计数器更新的一致性
    await this.prisma.$transaction(async (tx) => {
      // 删除关注关系
      await tx.userFollow.delete({
        where: {
          followerId_followingId: {
            followerId: currentUserId,
            followingId: targetUser.id,
          },
        },
      });

      // 更新当前用户的关注数
      await tx.user.update({
        where: { id: currentUserId },
        data: {
          followingCount: { decrement: 1 },
        },
      });

      // 更新目标用户的粉丝数
      await tx.user.update({
        where: { id: targetUser.id },
        data: {
          followersCount: { decrement: 1 },
        },
      });
    });

    // 获取更新后的计数
    const [currentUser, targetUserUpdated] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: currentUserId },
        select: { followingCount: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUser.id },
        select: { followersCount: true },
      }),
    ]);

    return {
      isFollowing: false,
      followerCount: targetUserUpdated?.followersCount || 0,
      followingCount: currentUser?.followingCount || 0,
    };
  }

  /**
   * 获取用户的关注列表
   */
  async getFollowingList(username: string, page = 1, pageSize = 20) {
    const user = await this.prisma.user.findUnique({
      where: {
        username,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const skip = (page - 1) * pageSize;
    const total = await this.prisma.userFollow.count({
      where: { followerId: user.id },
    });

    const follows = await this.prisma.userFollow.findMany({
      where: { followerId: user.id },
      include: {
        following: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            followersCount: true,
            followingCount: true,
            articleCount: true,
            videoCount: true,
            createdAt: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    const items = follows.map((follow) => ({
      ...follow.following,
      followedAt: follow.createdAt,
    }));

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
   * 获取用户的粉丝列表
   */
  async getFollowersList(username: string, page = 1, pageSize = 20) {
    const user = await this.prisma.user.findUnique({
      where: {
        username,
        deletedAt: null,
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const skip = (page - 1) * pageSize;
    const total = await this.prisma.userFollow.count({
      where: { followingId: user.id },
    });

    const follows = await this.prisma.userFollow.findMany({
      where: { followingId: user.id },
      include: {
        follower: {
          select: {
            id: true,
            username: true,
            avatar: true,
            bio: true,
            followersCount: true,
            followingCount: true,
            articleCount: true,
            videoCount: true,
            createdAt: true,
          },
        },
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    const items = follows.map((follow) => ({
      ...follow.follower,
      followedAt: follow.createdAt,
    }));

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
   * 检查当前用户是否关注目标用户
   */
  async checkFollowStatus(currentUserId: string, targetUsername: string): Promise<boolean> {
    const targetUser = await this.prisma.user.findUnique({
      where: {
        username: targetUsername,
        deletedAt: null,
      },
    });

    if (!targetUser) {
      throw new NotFoundException('目标用户不存在');
    }

    const follow = await this.prisma.userFollow.findUnique({
      where: {
        followerId_followingId: {
          followerId: currentUserId,
          followingId: targetUser.id,
        },
      },
    });

    return !!follow;
  }

  /**
   * 获取指定用户的文章列表
   */
  async getUserArticles(
    username: string,
    page = 1,
    pageSize = 20,
    type?: 'article' | 'video',
    currentUserId?: string,
  ): Promise<PaginatedArticles> {
    // 获取用户ID
    const user = await this.prisma.user.findUnique({
      where: {
        username,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const skip = (page - 1) * pageSize;

    // 构建查询条件
    const where: any = {
      userId: user.id,
      deletedAt: null,
    };

    if (type) {
      where.type = type;
    }

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
      orderBy: { createdAt: 'desc' },
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

        // 映射到ArticleResponse格式
        const response: ArticleResponse = {
          id: article.id,
          title: article.title,
          content: article.content,
          excerpt: article.excerpt,
          cover: article.cover,
          type: article.type as 'article' | 'video',
          duration: article.duration,
          bilibiliUrl: article.bilibiliUrl,
          bvid: null, // 暂时设为null，如果需要可以后续添加提取逻辑
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
          isLiked,
        };

        return response;
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
   * 获取创作者列表（isCreator为true的用户）
   */
  async getCreators(page = 1, pageSize = 20) {
    const skip = (page - 1) * pageSize;
    const total = await this.prisma.user.count({
      where: {
        isCreator: true,
        deletedAt: null,
      },
    });

    const creators = await this.prisma.user.findMany({
      where: {
        isCreator: true,
        deletedAt: null,
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        bio: true,
        followersCount: true,
        followingCount: true,
        articleCount: true,
        videoCount: true,
        isCreator: true,
        createdAt: true,
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: 'desc' },
    });

    return {
      items: creators,
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
}
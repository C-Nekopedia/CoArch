import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CommentsService,
  CommentResponse,
  PaginatedComments,
} from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { ArticleIdParamDto } from './dto/article-id-param.dto';
import { CommentIdParamDto } from './dto/comment-id-param.dto';

@ApiTags('评论')
@Controller({ path: 'comments', version: '1' })
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post('articles/:articleId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建评论' })
  @ApiParam({
    name: 'articleId',
    description: '文章ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '创建评论成功',
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          content: '这篇内容非常有价值，谢谢分享！',
          likesCount: 0,
          createdAt: '2026-03-28T10:30:00.000Z',
          updatedAt: '2026-03-28T10:30:00.000Z',
          depth: 1,
          articleId: '550e8400-e29b-41d4-a716-446655440000',
          userId: 'uuid',
          user: {
            id: 'uuid',
            username: 'john_doe',
            avatar: 'https://example.com/avatar.jpg',
          },
          parentId: null,
          replies: [],
          isLiked: false,
        },
        message: '评论创建成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '文章不存在',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数无效（如评论层级太深）',
  })
  async createComment(
    @Param() params: ArticleIdParamDto,
    @Request() req,
    @Body() createCommentDto: CreateCommentDto,
  ) {
    const comment = await this.commentsService.createComment(
      params.articleId,
      req.user.id,
      createCommentDto,
    );
    return {
      success: true,
      data: comment,
      message: '评论创建成功',
    };
  }

  @Get('articles/:articleId/comments')
  @ApiOperation({ summary: '获取文章评论列表（支持分页）' })
  @ApiParam({
    name: 'articleId',
    description: '文章ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认为20，最大100' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取评论列表成功',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              content: '这篇内容非常有价值，谢谢分享！',
              likesCount: 5,
              createdAt: '2026-03-28T10:30:00.000Z',
              updatedAt: '2026-03-28T10:30:00.000Z',
              depth: 1,
              articleId: '550e8400-e29b-41d4-a716-446655440000',
              userId: 'uuid',
              user: {
                id: 'uuid',
                username: 'john_doe',
                avatar: 'https://example.com/avatar.jpg',
              },
              parentId: null,
              replies: [
                {
                  id: '223e4567-e89b-12d3-a456-426614174000',
                  content: '我也觉得很有价值！',
                  likesCount: 2,
                  createdAt: '2026-03-28T10:35:00.000Z',
                  updatedAt: '2026-03-28T10:35:00.000Z',
                  depth: 2,
                  articleId: '550e8400-e29b-41d4-a716-446655440000',
                  userId: 'uuid',
                  user: {
                    id: 'uuid',
                    username: 'jane_doe',
                    avatar: 'https://example.com/avatar2.jpg',
                  },
                  parentId: '123e4567-e89b-12d3-a456-426614174000',
                  replies: [],
                  isLiked: false,
                },
              ],
              isLiked: true,
            },
          ],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 50,
            totalPages: 3,
            hasNext: true,
            hasPrev: false,
          },
        },
        message: '获取评论列表成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '文章不存在',
  })
  async getArticleComments(
    @Param() params: ArticleIdParamDto,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Request() req?,
  ) {
    const currentUserId = req?.user?.id;
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 20;

    const result = await this.commentsService.getArticleComments(
      params.articleId,
      pageNum,
      pageSizeNum,
      currentUserId,
    );
    return {
      success: true,
      data: result,
      message: '获取评论列表成功',
    };
  }

  @Get(':commentId')
  @ApiOperation({ summary: '获取评论详情' })
  @ApiParam({
    name: 'commentId',
    description: '评论ID（UUID格式）',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取评论详情成功',
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          content: '这篇内容非常有价值，谢谢分享！',
          likesCount: 5,
          createdAt: '2026-03-28T10:30:00.000Z',
          updatedAt: '2026-03-28T10:30:00.000Z',
          depth: 1,
          articleId: '550e8400-e29b-41d4-a716-446655440000',
          userId: 'uuid',
          user: {
            id: 'uuid',
            username: 'john_doe',
            avatar: 'https://example.com/avatar.jpg',
          },
          parentId: null,
          replies: [],
          isLiked: true,
        },
        message: '获取评论详情成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '评论不存在',
  })
  async getCommentById(
    @Param() params: CommentIdParamDto,
    @Request() req?,
  ) {
    const currentUserId = req?.user?.id;
    const comment = await this.commentsService.getCommentById(
      params.commentId,
      currentUserId,
    );
    return {
      success: true,
      data: comment,
      message: '获取评论详情成功',
    };
  }

  @Put(':commentId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新评论' })
  @ApiParam({
    name: 'commentId',
    description: '评论ID（UUID格式）',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新评论成功',
    schema: {
      example: {
        success: true,
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          content: '更新后的评论内容，感谢作者补充细节！',
          likesCount: 5,
          createdAt: '2026-03-28T10:30:00.000Z',
          updatedAt: '2026-03-28T11:30:00.000Z',
          depth: 1,
          articleId: '550e8400-e29b-41d4-a716-446655440000',
          userId: 'uuid',
          user: {
            id: 'uuid',
            username: 'john_doe',
            avatar: 'https://example.com/avatar.jpg',
          },
          parentId: null,
          replies: [],
          isLiked: true,
        },
        message: '评论更新成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '评论不存在',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '无权修改此评论',
  })
  async updateComment(
    @Param() params: CommentIdParamDto,
    @Request() req,
    @Body() updateCommentDto: UpdateCommentDto,
  ) {
    const comment = await this.commentsService.updateComment(
      params.commentId,
      req.user.id,
      updateCommentDto,
    );
    return {
      success: true,
      data: comment,
      message: '评论更新成功',
    };
  }

  @Delete(':commentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除评论' })
  @ApiParam({
    name: 'commentId',
    description: '评论ID（UUID格式）',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: '删除成功',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '评论不存在',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '无权删除此评论',
  })
  async deleteComment(@Param() params: CommentIdParamDto, @Request() req) {
    await this.commentsService.deleteComment(params.commentId, req.user.id);
    return {
      success: true,
      message: '评论删除成功',
    };
  }

  @Post(':commentId/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞评论' })
  @ApiParam({
    name: 'commentId',
    description: '评论ID（UUID格式）',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '点赞成功',
    schema: {
      example: {
        success: true,
        data: {
          isLiked: true,
          likesCount: 6,
        },
        message: '点赞成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '评论不存在',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '已经点赞过该评论',
  })
  async likeComment(@Param() params: CommentIdParamDto, @Request() req) {
    const result = await this.commentsService.likeComment(
      params.commentId,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      message: '点赞成功',
    };
  }

  @Delete(':commentId/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消点赞评论' })
  @ApiParam({
    name: 'commentId',
    description: '评论ID（UUID格式）',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '取消点赞成功',
    schema: {
      example: {
        success: true,
        data: {
          isLiked: false,
          likesCount: 5,
        },
        message: '取消点赞成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '评论不存在',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '尚未点赞该评论',
  })
  async unlikeComment(@Param() params: CommentIdParamDto, @Request() req) {
    const result = await this.commentsService.unlikeComment(
      params.commentId,
      req.user.id,
    );
    return {
      success: true,
      data: result,
      message: '取消点赞成功',
    };
  }
}
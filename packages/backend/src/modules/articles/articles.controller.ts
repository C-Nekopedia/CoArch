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
import { ArticlesService, ArticleResponse, PaginatedArticles } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { GetArticlesQueryDto } from './dto/get-articles-query.dto';
import { ArticleIdParamDto } from './dto/article-id-param.dto';

@ApiTags('内容')
@Controller({ path: 'articles', version: '1' })
export class ArticlesController {
  constructor(private readonly articlesService: ArticlesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建文章或视频' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: '创建成功',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: '我的第一篇技术文章',
          content: '# 标题\n\n这里是文章内容...',
          excerpt: '这是一篇关于技术的文章...',
          cover: 'https://example.com/cover.jpg',
          type: 'article',
          duration: null,
          bilibiliUrl: null,
          tags: ['技术', '编程', 'JavaScript'],
          category: '技术',
          viewsCount: 0,
          likesCount: 0,
          commentsCount: 0,
          createdAt: '2026-03-28T10:30:00.000Z',
          updatedAt: '2026-03-28T10:30:00.000Z',
          publishedAt: '2026-03-28T10:30:00.000Z',
          userId: 'uuid',
          user: {
            id: 'uuid',
            username: 'john_doe',
            avatar: 'https://example.com/avatar.jpg',
          },
          isLiked: false,
        },
        message: '创建成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '请求参数无效',
  })
  async createArticle(@Request() req, @Body() createArticleDto: CreateArticleDto) {
    const article = await this.articlesService.createArticle(req.user.id, createArticleDto);
    return {
      success: true,
      data: article,
      message: '创建成功',
    };
  }

  @Get()
  @ApiOperation({ summary: '获取内容列表（支持分页、筛选、排序）' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({ name: 'pageSize', required: false, description: '每页数量，默认为20，最大100' })
  @ApiQuery({ name: 'type', required: false, description: '内容类型：article（文章）或 video（视频）' })
  @ApiQuery({ name: 'author', required: false, description: '作者用户名' })
  @ApiQuery({ name: 'category', required: false, description: '分类' })
  @ApiQuery({ name: 'tag', required: false, description: '标签' })
  @ApiQuery({ name: 'search', required: false, description: '搜索关键词' })
  @ApiQuery({ name: 'sortBy', required: false, description: '排序字段：createdAt（创建时间）、views（浏览量）、likes（点赞数）、comments（评论数）' })
  @ApiQuery({ name: 'sortOrder', required: false, description: '排序顺序：asc（升序）或 desc（降序）' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取内容列表成功',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              title: '我的第一篇技术文章',
              content: '# 标题\n\n这里是文章内容...',
              excerpt: '这是一篇关于技术的文章...',
              cover: 'https://example.com/cover.jpg',
              type: 'article',
              duration: null,
              bilibiliUrl: null,
              tags: ['技术', '编程', 'JavaScript'],
              category: '技术',
              viewsCount: 100,
              likesCount: 50,
              commentsCount: 20,
              createdAt: '2026-03-28T10:30:00.000Z',
              updatedAt: '2026-03-28T10:30:00.000Z',
              publishedAt: '2026-03-28T10:30:00.000Z',
              userId: 'uuid',
              user: {
                id: 'uuid',
                username: 'john_doe',
                avatar: 'https://example.com/avatar.jpg',
              },
              isLiked: true,
            },
          ],
          pagination: {
            page: 1,
            pageSize: 20,
            total: 100,
            totalPages: 5,
            hasNext: true,
            hasPrev: false,
          },
        },
        message: '获取内容列表成功',
      },
    },
  })
  async getArticles(@Query() query: GetArticlesQueryDto, @Request() req?) {
    const currentUserId = req?.user?.id;
    const result = await this.articlesService.getArticles(query, currentUserId);
    return {
      success: true,
      data: result,
      message: '获取内容列表成功',
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '获取内容详情' })
  @ApiParam({
    name: 'id',
    description: '内容ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取内容详情成功',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: '我的第一篇技术文章',
          content: '# 标题\n\n这里是文章内容...',
          excerpt: '这是一篇关于技术的文章...',
          cover: 'https://example.com/cover.jpg',
          type: 'article',
          duration: null,
          bilibiliUrl: null,
          tags: ['技术', '编程', 'JavaScript'],
          category: '技术',
          viewsCount: 100,
          likesCount: 50,
          commentsCount: 20,
          createdAt: '2026-03-28T10:30:00.000Z',
          updatedAt: '2026-03-28T10:30:00.000Z',
          publishedAt: '2026-03-28T10:30:00.000Z',
          userId: 'uuid',
          user: {
            id: 'uuid',
            username: 'john_doe',
            avatar: 'https://example.com/avatar.jpg',
          },
          isLiked: true,
        },
        message: '获取内容详情成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '内容不存在',
  })
  async getArticleById(@Param() params: ArticleIdParamDto, @Request() req?) {
    const currentUserId = req?.user?.id;
    const article = await this.articlesService.getArticleById(params.id, currentUserId);
    return {
      success: true,
      data: article,
      message: '获取内容详情成功',
    };
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新内容' })
  @ApiParam({
    name: 'id',
    description: '内容ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新内容成功',
    schema: {
      example: {
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          title: '更新后的标题',
          content: '# 更新后的内容...',
          excerpt: '这是更新后的摘要...',
          cover: 'https://example.com/new-cover.jpg',
          type: 'article',
          duration: null,
          bilibiliUrl: null,
          tags: ['更新', '技术', '编程'],
          category: '技术分享',
          viewsCount: 100,
          likesCount: 50,
          commentsCount: 20,
          createdAt: '2026-03-28T10:30:00.000Z',
          updatedAt: '2026-03-28T11:30:00.000Z',
          publishedAt: '2026-03-28T10:30:00.000Z',
          userId: 'uuid',
          user: {
            id: 'uuid',
            username: 'john_doe',
            avatar: 'https://example.com/avatar.jpg',
          },
          isLiked: true,
        },
        message: '更新内容成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '内容不存在',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '无权修改此内容',
  })
  async updateArticle(
    @Param() params: ArticleIdParamDto,
    @Request() req,
    @Body() updateArticleDto: UpdateArticleDto,
  ) {
    const article = await this.articlesService.updateArticle(
      params.id,
      req.user.id,
      updateArticleDto,
    );
    return {
      success: true,
      data: article,
      message: '更新内容成功',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '删除内容' })
  @ApiParam({
    name: 'id',
    description: '内容ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
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
    description: '内容不存在',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: '无权删除此内容',
  })
  async deleteArticle(@Param() params: ArticleIdParamDto, @Request() req) {
    await this.articlesService.deleteArticle(params.id, req.user.id);
    return {
      success: true,
      message: '删除成功',
    };
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '点赞内容' })
  @ApiParam({
    name: 'id',
    description: '内容ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '点赞成功',
    schema: {
      example: {
        success: true,
        data: {
          isLiked: true,
          likesCount: 51,
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
    description: '内容不存在',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '已经点赞过该内容',
  })
  async likeArticle(@Param() params: ArticleIdParamDto, @Request() req) {
    const result = await this.articlesService.likeArticle(params.id, req.user.id);
    return {
      success: true,
      data: result,
      message: '点赞成功',
    };
  }

  @Delete(':id/like')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消点赞内容' })
  @ApiParam({
    name: 'id',
    description: '内容ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '取消点赞成功',
    schema: {
      example: {
        success: true,
        data: {
          isLiked: false,
          likesCount: 50,
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
    description: '内容不存在',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '尚未点赞该内容',
  })
  async unlikeArticle(@Param() params: ArticleIdParamDto, @Request() req) {
    const result = await this.articlesService.unlikeArticle(params.id, req.user.id);
    return {
      success: true,
      data: result,
      message: '取消点赞成功',
    };
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '增加内容浏览量' })
  @ApiParam({
    name: 'id',
    description: '内容ID（UUID格式）',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '浏览量增加成功',
    schema: {
      example: {
        success: true,
        message: '浏览量增加成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '内容不存在',
  })
  async incrementViewCount(@Param() params: ArticleIdParamDto) {
    await this.articlesService.incrementViewCount(params.id);
    return {
      success: true,
      message: '浏览量增加成功',
    };
  }
}
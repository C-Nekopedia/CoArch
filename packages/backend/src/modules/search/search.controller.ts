import {
  Controller,
  Get,
  Query,
  Request,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { SearchService, SearchResults } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('搜索')
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '全局搜索（文章/视频）' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: '每页数量，默认为20，最大100',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description:
      '排序字段：relevance（相关度）、createdAt（创建时间）、views（浏览量）、likes（点赞数）、comments（评论数）',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: '排序顺序：desc（降序）或 asc（升序）',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: '内容类型过滤：article（文章）、video（视频）、all（全部）',
  })
  @ApiQuery({ name: 'category', required: false, description: '分类过滤' })
  @ApiQuery({ name: 'tag', required: false, description: '标签过滤' })
  @ApiQuery({ name: 'author', required: false, description: '作者用户名过滤' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '搜索成功',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              title: '一篇关于技术的文章',
              content: '这是文章内容...',
              excerpt: '文章摘要...',
              cover: 'https://example.com/cover.jpg',
              type: 'article',
              duration: null,
              bilibiliUrl: null,
              tags: ['技术', '编程'],
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
              relevanceScore: 15,
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
          suggestions: ['技术教程', '编程入门', 'JavaScript'],
        },
        message: '搜索成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '搜索关键词无效（如长度不足、包含特殊字符等）',
  })
  async search(@Query() searchQueryDto: SearchQueryDto, @Request() req?) {
    // 验证搜索查询
    const validation = this.searchService.validateSearchQuery(searchQueryDto.q);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.reason,
        code: 4000,
        message: '搜索关键词无效',
      };
    }

    const currentUserId = req?.user?.id;
    const results = await this.searchService.search(
      searchQueryDto,
      currentUserId,
    );

    return {
      success: true,
      data: results,
      message: '搜索成功',
    };
  }

  @Get('suggestions')
  @ApiOperation({ summary: '获取搜索建议（标签、分类、作者）' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词前缀' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取搜索建议成功',
    schema: {
      example: {
        success: true,
        data: {
          tags: ['技术', '编程', 'JavaScript'],
          categories: ['技术分享', '编程入门'],
          authors: ['john_doe', 'jane_doe'],
        },
        message: '获取搜索建议成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '搜索关键词太短（至少2个字符）',
  })
  async getSearchSuggestions(@Query('q') query: string) {
    if (!query || query.trim().length < 2) {
      return {
        success: false,
        error: '搜索关键词至少需要2个字符',
        code: 4000,
        message: '搜索关键词太短',
      };
    }

    const suggestions = await this.searchService.getSearchSuggestions(query);

    return {
      success: true,
      data: suggestions,
      message: '获取搜索建议成功',
    };
  }

  @Get('popular')
  @ApiOperation({ summary: '获取热门搜索关键词' })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: '返回数量，默认为10，最大50',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取热门搜索成功',
    schema: {
      example: {
        success: true,
        data: {
          keywords: [
            '技术',
            '编程',
            'JavaScript',
            'TypeScript',
            'Vue',
            'React',
            'Node.js',
            '后端开发',
            '前端开发',
            '数据库',
          ],
        },
        message: '获取热门搜索成功',
      },
    },
  })
  async getPopularSearches(@Query('limit') limit?: string) {
    const limitNum = limit ? Math.min(parseInt(limit, 10), 50) : 10;
    const keywords = await this.searchService.getPopularSearches(limitNum);

    return {
      success: true,
      data: { keywords },
      message: '获取热门搜索成功',
    };
  }

  @Get('advanced')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '高级搜索（需要认证，支持更复杂的查询）' })
  @ApiQuery({ name: 'q', required: true, description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: '每页数量，默认为20，最大100',
  })
  @ApiQuery({
    name: 'fields',
    required: false,
    description:
      '搜索字段：title（标题）、content（内容）、tags（标签）、all（全部）',
    enum: ['title', 'content', 'tags', 'all'],
  })
  @ApiQuery({
    name: 'dateRange',
    required: false,
    description:
      '时间范围：today（今天）、week（本周）、month（本月）、year（本年）、all（全部）',
    enum: ['today', 'week', 'month', 'year', 'all'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '高级搜索成功',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  async advancedSearch(
    @Query() searchQueryDto: SearchQueryDto,
    @Query('fields') fields: string = 'all',
    @Query('dateRange') dateRange: string = 'all',
    @Request() req,
  ) {
    // 验证搜索查询
    const validation = this.searchService.validateSearchQuery(searchQueryDto.q);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.reason,
        code: 4000,
        message: '搜索关键词无效',
      };
    }

    const currentUserId = req.user.id;

    // 这里可以实现更高级的搜索逻辑
    // 目前先调用基础的搜索服务
    const results = await this.searchService.search(
      searchQueryDto,
      currentUserId,
    );

    return {
      success: true,
      data: results,
      message: '高级搜索成功',
    };
  }
}

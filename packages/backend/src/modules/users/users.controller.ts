import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
  Version,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  UsersService,
  PublicUserProfile,
  UserProfile,
  FollowStatus,
} from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GetUserParamsDto } from './dto/get-user-params.dto';
import { UploadService } from '../upload/upload.service';

@ApiTags('用户')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {}

  @Get('creators')
  @ApiOperation({ summary: '获取创作者列表' })
  @ApiQuery({
    name: 'page',
    description: '页码，默认为1',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    description: '每页数量，默认为20',
    required: false,
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取创作者列表成功',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: 'uuid',
              username: 'design_lover',
              avatar: 'https://example.com/avatar.jpg',
              bio: '摄影｜生活｜不定期分享胶片与日常',
              followersCount: 128,
              followingCount: 50,
              articleCount: 10,
              videoCount: 5,
              isCreator: true,
              createdAt: '2026-03-28T10:30:00.000Z',
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
        message: '获取创作者列表成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  async getCreators(@Query('page') page = 1, @Query('pageSize') pageSize = 20) {
    const pageNum = Math.max(1, parseInt(page.toString(), 10));
    const pageSizeNum = Math.max(
      1,
      Math.min(parseInt(pageSize.toString(), 10), 100),
    );

    const creatorsList = await this.usersService.getCreators(
      pageNum,
      pageSizeNum,
    );
    return {
      success: true,
      data: creatorsList,
      message: '获取创作者列表成功',
    };
  }

  @Get(':username')
  @ApiOperation({ summary: '获取用户公开资料' })
  @ApiParam({
    name: 'username',
    description: '用户名',
    example: 'john_doe',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取用户资料成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          username: 'john_doe',
          avatar: 'https://example.com/avatar.jpg',
          bio: '热爱编程的开发者',
          followersCount: 100,
          followingCount: 50,
          articleCount: 10,
          videoCount: 5,
          createdAt: '2026-03-28T10:30:00.000Z',
        },
        message: '获取用户资料成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async getUserProfile(@Param() params: GetUserParamsDto) {
    const userProfile = await this.usersService.getUserProfile(params.username);
    return {
      success: true,
      data: userProfile,
      message: '获取用户资料成功',
    };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新当前用户资料' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新用户资料成功',
    schema: {
      example: {
        success: true,
        data: {
          id: 'uuid',
          username: 'john_doe',
          email: 'john@example.com',
          avatar: 'https://example.com/avatar.jpg',
          bio: '热爱编程的开发者',
          followersCount: 100,
          followingCount: 50,
          articleCount: 10,
          videoCount: 5,
          createdAt: '2026-03-28T10:30:00.000Z',
          updatedAt: '2026-03-28T10:30:00.000Z',
          lastLoginAt: '2026-03-28T10:30:00.000Z',
        },
        message: '更新用户资料成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async updateProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const updatedProfile = await this.usersService.updateUserProfile(
      req.user.id,
      updateProfileDto,
    );
    return {
      success: true,
      data: updatedProfile,
      message: '更新用户资料成功',
    };
  }

  @Post('avatar')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传用户头像' })
  @ApiBody({
    description: '头像图片文件',
    schema: {
      type: 'object',
      properties: {
        avatar: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '头像上传成功',
    schema: {
      example: {
        success: true,
        data: {
          url: '/uploads/avatar-550e8400-e29b-41d4-a716-446655440000-123456789.jpg',
          filename: 'avatar-550e8400-e29b-41d4-a716-446655440000-123456789.jpg',
          user: {
            id: 'uuid',
            username: 'testuser',
            email: 'test@example.com',
            avatar:
              '/uploads/avatar-550e8400-e29b-41d4-a716-446655440000-123456789.jpg',
            bio: '热爱编程的开发者',
            followersCount: 0,
            followingCount: 0,
            articleCount: 0,
            videoCount: 0,
            createdAt: '2026-03-28T10:30:00.000Z',
            updatedAt: '2026-03-28T10:30:00.000Z',
            lastLoginAt: '2026-03-28T10:30:00.000Z',
          },
        },
        message: '头像上传成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '文件不能为空或文件类型不支持',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.PAYLOAD_TOO_LARGE,
    description: '文件大小超过限制',
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: multer.diskStorage({
        destination: (req, file, cb) => {
          const uploadDir = './uploads';
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = path.extname(file.originalname);
          const filename = `avatar-${uniqueSuffix}${ext}`;
          cb(null, filename);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = [
          'image/jpeg',
          'image/png',
          'image/gif',
          'image/webp',
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error(`不支持的文件类型: ${file.mimetype}`), false);
        }
      },
    }),
  )
  async uploadAvatar(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }

    // 使用UploadService处理文件上传
    const uploadResult = await this.uploadService.uploadFile(file);

    // 更新用户头像
    const updateProfileDto = {
      avatar: uploadResult.url,
      bio: undefined, // 保持bio不变
    };

    const updatedUser = await this.usersService.updateUserProfile(
      req.user.id,
      updateProfileDto as UpdateProfileDto,
    );

    return {
      success: true,
      data: {
        url: uploadResult.url,
        filename: uploadResult.filename,
        user: updatedUser,
      },
      message: '头像上传成功',
    };
  }

  @Post(':username/follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '关注用户' })
  @ApiParam({
    name: 'username',
    description: '要关注的用户名',
    example: 'jane_doe',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '关注成功',
    schema: {
      example: {
        success: true,
        data: {
          isFollowing: true,
          followerCount: 101,
          followingCount: 51,
        },
        message: '关注成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '目标用户不存在',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '已经关注该用户',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '不能关注自己',
  })
  async followUser(@Request() req, @Param() params: GetUserParamsDto) {
    const followStatus = await this.usersService.followUser(
      req.user.id,
      params.username,
    );
    return {
      success: true,
      data: followStatus,
      message: '关注成功',
    };
  }

  @Delete(':username/follow')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取消关注用户' })
  @ApiParam({
    name: 'username',
    description: '要取消关注的用户名',
    example: 'jane_doe',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '取消关注成功',
    schema: {
      example: {
        success: true,
        data: {
          isFollowing: false,
          followerCount: 100,
          followingCount: 50,
        },
        message: '取消关注成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: '未授权访问',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '目标用户不存在',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '尚未关注该用户',
  })
  async unfollowUser(@Request() req, @Param() params: GetUserParamsDto) {
    const followStatus = await this.usersService.unfollowUser(
      req.user.id,
      params.username,
    );
    return {
      success: true,
      data: followStatus,
      message: '取消关注成功',
    };
  }

  @Get(':username/following')
  @ApiOperation({ summary: '获取用户的关注列表' })
  @ApiParam({
    name: 'username',
    description: '用户名',
    example: 'john_doe',
  })
  @ApiQuery({
    name: 'page',
    description: '页码，默认为1',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    description: '每页数量，默认为20',
    required: false,
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取关注列表成功',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: 'uuid',
              username: 'jane_doe',
              avatar: 'https://example.com/avatar.jpg',
              bio: '设计师',
              followersCount: 200,
              followingCount: 80,
              articleCount: 5,
              videoCount: 2,
              createdAt: '2026-03-28T10:30:00.000Z',
              followedAt: '2026-03-28T10:30:00.000Z',
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
        message: '获取关注列表成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async getFollowingList(
    @Param() params: GetUserParamsDto,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    const pageNum = Math.max(1, parseInt(page.toString(), 10));
    const pageSizeNum = Math.max(
      1,
      Math.min(parseInt(pageSize.toString(), 10), 100),
    );

    const followingList = await this.usersService.getFollowingList(
      params.username,
      pageNum,
      pageSizeNum,
    );
    return {
      success: true,
      data: followingList,
      message: '获取关注列表成功',
    };
  }

  @Get(':username/followers')
  @ApiOperation({ summary: '获取用户的粉丝列表' })
  @ApiParam({
    name: 'username',
    description: '用户名',
    example: 'john_doe',
  })
  @ApiQuery({
    name: 'page',
    description: '页码，默认为1',
    required: false,
    example: 1,
  })
  @ApiQuery({
    name: 'pageSize',
    description: '每页数量，默认为20',
    required: false,
    example: 20,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取粉丝列表成功',
    schema: {
      example: {
        success: true,
        data: {
          items: [
            {
              id: 'uuid',
              username: 'alice_smith',
              avatar: 'https://example.com/avatar.jpg',
              bio: '摄影师',
              followersCount: 150,
              followingCount: 60,
              articleCount: 8,
              videoCount: 3,
              createdAt: '2026-03-28T10:30:00.000Z',
              followedAt: '2026-03-28T10:30:00.000Z',
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
        message: '获取粉丝列表成功',
        timestamp: '2026-03-28T10:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async getFollowersList(
    @Param() params: GetUserParamsDto,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
  ) {
    const pageNum = Math.max(1, parseInt(page.toString(), 10));
    const pageSizeNum = Math.max(
      1,
      Math.min(parseInt(pageSize.toString(), 10), 100),
    );

    const followersList = await this.usersService.getFollowersList(
      params.username,
      pageNum,
      pageSizeNum,
    );
    return {
      success: true,
      data: followersList,
      message: '获取粉丝列表成功',
    };
  }

  @Get(':username/articles')
  @ApiOperation({ summary: '获取用户的文章/视频列表' })
  @ApiParam({
    name: 'username',
    description: '用户名',
    example: 'john_doe',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码，默认为1' })
  @ApiQuery({
    name: 'pageSize',
    required: false,
    description: '每页数量，默认为20，最大100',
  })
  @ApiQuery({
    name: 'type',
    required: false,
    description: '内容类型：article（文章）或 video（视频）',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '获取用户内容列表成功',
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
        message: '获取用户内容列表成功',
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: '用户不存在',
  })
  async getUserArticles(
    @Param() params: GetUserParamsDto,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 20,
    @Query('type') type?: 'article' | 'video',
    @Request() req?,
  ) {
    const pageNum = Math.max(1, parseInt(page.toString(), 10));
    const pageSizeNum = Math.max(
      1,
      Math.min(parseInt(pageSize.toString(), 10), 100),
    );
    const currentUserId = req?.user?.id;

    const result = await this.usersService.getUserArticles(
      params.username,
      pageNum,
      pageSizeNum,
      type,
      currentUserId,
    );
    return {
      success: true,
      data: result,
      message: '获取用户内容列表成功',
    };
  }
}

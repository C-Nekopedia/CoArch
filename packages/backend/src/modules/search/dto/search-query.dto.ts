import {
  IsString,
  IsOptional,
  IsNumber,
  IsIn,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class SearchQueryDto {
  @ApiProperty({
    description: '搜索关键词',
    example: '技术文章',
  })
  @IsString()
  q: string;

  @ApiPropertyOptional({
    description: '页码，默认为1',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: '每页数量，默认为20，最大100',
    example: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description:
      '排序字段：relevance（相关度）、createdAt（创建时间）、views（浏览量）、likes（点赞数）、comments（评论数）',
    example: 'relevance',
    enum: [
      'relevance',
      'createdAt',
      'viewsCount',
      'likesCount',
      'commentsCount',
    ],
  })
  @IsOptional()
  @IsString()
  @IsIn(['relevance', 'createdAt', 'viewsCount', 'likesCount', 'commentsCount'])
  sortBy?: string = 'relevance';

  @ApiPropertyOptional({
    description: '排序顺序：desc（降序）或 asc（升序）',
    example: 'desc',
    enum: ['desc', 'asc'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['desc', 'asc'])
  sortOrder?: 'desc' | 'asc' = 'desc';

  @ApiPropertyOptional({
    description: '内容类型过滤：article（文章）、video（视频）、all（全部）',
    example: 'all',
    enum: ['article', 'video', 'all'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['article', 'video', 'all'])
  type?: 'article' | 'video' | 'all' = 'all';

  @ApiPropertyOptional({
    description: '分类过滤',
    example: '技术',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: '标签过滤',
    example: '编程',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: '作者用户名过滤',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  author?: string;
}

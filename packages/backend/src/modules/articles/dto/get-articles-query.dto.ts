import { IsOptional, IsString, IsIn, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetArticlesQueryDto {
  @ApiPropertyOptional({
    description: '页码，默认为1',
    example: 1,
    minimum: 1,
  })
  @IsOptional()
  @Type(() => Number)
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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @ApiPropertyOptional({
    description: '内容类型：article（文章）或 video（视频）',
    example: 'article',
    enum: ['article', 'video'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['article', 'video'])
  type?: 'article' | 'video';

  @ApiPropertyOptional({
    description: '作者用户名',
    example: 'john_doe',
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiPropertyOptional({
    description: '分类',
    example: '技术',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    description: '标签',
    example: 'JavaScript',
  })
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional({
    description: '搜索关键词',
    example: 'NestJS教程',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    description: '排序字段：createdAt（创建时间）、views（浏览量）、likes（点赞数）、comments（评论数）',
    example: 'createdAt',
    enum: ['createdAt', 'views', 'likes', 'comments'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'views', 'likes', 'comments'])
  sortBy?: 'createdAt' | 'views' | 'likes' | 'comments' = 'createdAt';

  @ApiPropertyOptional({
    description: '排序顺序：asc（升序）或 desc（降序）',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
import {
  IsString,
  IsOptional,
  IsUrl,
  IsArray,
  IsIn,
  MaxLength,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateArticleRequest } from '@coarch/shared';

export class CreateArticleDto implements CreateArticleRequest {
  @ApiProperty({
    description: '内容标题',
    example: '我的第一篇技术文章',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  title: string;

  @ApiProperty({
    description: '内容正文（支持Markdown格式）',
    example: '# 标题\n\n这里是文章内容...',
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: '内容摘要，自动从正文提取前200字符',
    example: '这是一篇关于技术的文章...',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({
    description: '封面图URL',
    example: 'https://example.com/cover.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @MaxLength(500)
  cover?: string;

  @ApiProperty({
    description: '内容类型：article（文章）或 video（视频）',
    example: 'article',
    enum: ['article', 'video'],
  })
  @IsString()
  @IsIn(['article', 'video'])
  type: 'article' | 'video';

  @ApiPropertyOptional({
    description: '视频时长，格式：HH:MM:SS 或 MM:SS',
    example: '12:30',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  duration?: string;

  @ApiPropertyOptional({
    description: 'B站视频链接（仅视频类型需要）',
    example: 'https://www.bilibili.com/video/BV1xx411c7mD',
    maxLength: 500,
  })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  bilibiliUrl?: string;

  @ApiPropertyOptional({
    description: '标签数组',
    example: ['技术', '编程', 'JavaScript'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: '分类',
    example: '技术',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @ApiPropertyOptional({
    description: '是否保存为草稿（暂不支持，预留字段）',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;
}

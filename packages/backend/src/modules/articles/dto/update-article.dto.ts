import { IsString, IsOptional, IsUrl, IsArray, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UpdateArticleRequest } from '@coarch/shared';

export class UpdateArticleDto implements UpdateArticleRequest {
  @ApiPropertyOptional({
    description: '内容标题',
    example: '修改后的文章标题',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: '内容正文（支持Markdown格式）',
    example: '# 更新后的内容\n\n这里是更新后的文章内容...',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: '内容摘要，自动从正文提取前200字符',
    example: '这是更新后的摘要...',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({
    description: '封面图URL',
    example: 'https://example.com/new-cover.jpg',
    maxLength: 500,
  })
  @IsOptional()
  @MaxLength(500)
  cover?: string;

  @ApiPropertyOptional({
    description: '标签数组',
    example: ['更新', '技术', '编程'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({
    description: '分类',
    example: '技术分享',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}
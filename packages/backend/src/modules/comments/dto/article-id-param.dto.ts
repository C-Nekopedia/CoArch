import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ArticleIdParamDto {
  @ApiProperty({
    description: '文章ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  articleId: string;
}

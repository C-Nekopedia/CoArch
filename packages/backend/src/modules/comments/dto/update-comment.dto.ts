import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCommentDto {
  @ApiProperty({
    description: '评论内容',
    example: '更新后的评论内容，感谢作者补充细节！',
  })
  @IsString()
  @MaxLength(5000)
  content: string;
}
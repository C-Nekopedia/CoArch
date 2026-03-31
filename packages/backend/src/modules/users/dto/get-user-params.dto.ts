import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { USERNAME_REGEX } from '@coarch/shared';

export class GetUserParamsDto {
  @ApiProperty({
    description: '用户名',
    example: 'john_doe',
  })
  @IsString()
  @Matches(USERNAME_REGEX, {
    message: '用户名只能包含汉字、字母、数字、下划线和连字符',
  })
  username: string;
}
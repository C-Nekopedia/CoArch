import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { USERNAME_REGEX, PASSWORD_REGEX } from '@coarch/shared';

export class RegisterDto {
  @ApiProperty({
    description: '用户名，3-15个字符，允许汉字、字母、数字、下划线和连字符',
    example: 'john_doe',
    minLength: 3,
    maxLength: 15,
  })
  @IsString()
  @MinLength(3)
  @MaxLength(15)
  @Matches(USERNAME_REGEX, {
    message: '用户名只能包含汉字、字母、数字、下划线和连字符',
  })
  username: string;

  @ApiProperty({
    description: '邮箱地址',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '密码，至少8个字符',
    example: 'Password123!',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, {
    message: '密码必须至少8位，且包含字母和数字',
  })
  password: string;

  @ApiPropertyOptional({
    description: '头像URL',
    example: 'https://example.com/avatar.jpg',
  })
  @IsOptional()
  @IsUrl()
  avatar?: string;

  @ApiPropertyOptional({
    description: '个人简介，最多500个字符',
    example: '热爱编程的开发者',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;
}

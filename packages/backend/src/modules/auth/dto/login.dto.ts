import { IsEmail, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LoginRequest } from '@coarch/shared';

export class LoginDto implements LoginRequest {
  @ApiProperty({
    description: '邮箱地址',
    example: 'john@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: '密码',
    example: 'Password123!',
  })
  @IsString()
  password: string;

  @ApiPropertyOptional({
    description: '记住我',
    example: true,
  })
  rememberMe?: boolean;
}
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { UploadService } from './upload.service';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    // 注册 Multer 模块，异步从配置服务获取选项
    MulterModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const uploadConfig = configService.get('config.upload');
        const uploadPath = uploadConfig?.path || './uploads';

        return {
          // 使用磁盘存储
          storage: multer.diskStorage({
            destination: (req, file, cb) => {
              cb(null, uploadPath);
            },
            filename: (req, file, cb) => {
              const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
              const ext = path.extname(file.originalname);
              const filename = `${uuidv4()}-${uniqueSuffix}${ext}`;
              cb(null, filename);
            },
          }),
          // 默认文件大小限制（可在具体路由中覆盖）
          limits: {
            fileSize: 10 * 1024 * 1024, // 10MB
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService],
  exports: [UploadService],
})
export class UploadModule {}
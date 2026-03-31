import { Module } from '@nestjs/common';
import { ArticlesController } from './articles.controller';
import { ImageProxyController } from './proxy.controller';
import { ArticlesService } from './articles.service';
import { BilibiliService } from './bilibili.service';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [PrismaModule, UploadModule],
  controllers: [ArticlesController, ImageProxyController],
  providers: [ArticlesService, BilibiliService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
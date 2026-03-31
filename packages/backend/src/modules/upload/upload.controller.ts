// @ts-nocheck
import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Param,
  Body,
  Res,
  HttpStatus,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { UploadService, UploadResult } from './upload.service';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiResponse } from '@nestjs/swagger';
import * as multer from 'multer';

@ApiTags('upload')
// 注意：完整API路径为 /api/v1/upload/...
// 全局前缀配置在 main.ts 中：app.setGlobalPrefix('/api'); app.enableVersioning({ type: VersioningType.URI, defaultVersion: 'v1' })
// 因此控制器路径 'upload' 会映射到 /api/v1/upload
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {
    console.log('UploadController构造函数，uploadService:', uploadService);
  }

  @Post('image')
  @ApiOperation({ summary: '上传单张图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '图片文件',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: '上传成功' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '文件不能为空或文件类型不支持' })
  @UseInterceptors(
    FileInterceptor('file', (req, file, callback) => {
      // 返回图片上传选项
      return this.uploadService.getImageUploadOptions();
    })
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
      if (!file) {
        throw new BadRequestException('请选择要上传的图片文件');
      }

      const result = await this.uploadService.uploadFile(file);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '图片上传失败',
      };
    }
  }

  @Post('images')
  @ApiOperation({ summary: '上传多张图片' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '图片文件数组',
    required: true,
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: '上传成功' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '文件不能为空或文件类型不支持' })
  @UseInterceptors(
    FilesInterceptor('files', 10, (req, file, callback) => {
      // 返回多图上传选项
      return this.uploadService.getMultipleImagesUploadOptions();
    })
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]): Promise<{ success: boolean; data?: UploadResult[]; error?: string }> {
    try {
      if (!files || files.length === 0) {
        throw new BadRequestException('请选择要上传的图片文件');
      }

      const results = await this.uploadService.uploadFiles(files);
      return {
        success: true,
        data: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '图片上传失败',
      };
    }
  }

  @Post('video')
  @ApiOperation({ summary: '上传视频文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '视频文件',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: '上传成功' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '文件不能为空或文件类型不支持' })
  @UseInterceptors(
    FileInterceptor('file', (req, file, callback) => {
      // 返回视频上传选项
      return this.uploadService.getVideoUploadOptions();
    })
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
      if (!file) {
        throw new BadRequestException('请选择要上传的视频文件');
      }

      const result = await this.uploadService.uploadFile(file);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '视频上传失败',
      };
    }
  }

  @Post('file')
  @ApiOperation({ summary: '上传通用文件' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: '通用文件',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: '上传成功' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '文件不能为空或文件类型不支持' })
  @UseInterceptors(
    FileInterceptor('file', (req, file, callback) => {
      // 返回通用文件上传选项
      return this.uploadService.getGenericUploadOptions();
    })
  )
  async uploadFile(@UploadedFile() file: Express.Multer.File): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
      if (!file) {
        throw new BadRequestException('请选择要上传的文件');
      }

      const result = await this.uploadService.uploadFile(file);
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '文件上传失败',
      };
    }
  }

  @Get(':filename')
  @ApiOperation({ summary: '获取文件信息' })
  @ApiResponse({ status: HttpStatus.OK, description: '文件信息获取成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  async getFileInfo(@Param('filename') filename: string): Promise<{ success: boolean; data?: UploadResult; error?: string }> {
    try {
      const fileInfo = this.uploadService.getFileInfo(filename);

      if (!fileInfo) {
        return {
          success: false,
          error: '文件不存在',
        };
      }

      return {
        success: true,
        data: fileInfo,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '获取文件信息失败',
      };
    }
  }

  @Delete(':filename')
  @ApiOperation({ summary: '删除文件' })
  @ApiResponse({ status: HttpStatus.OK, description: '文件删除成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  async deleteFile(@Param('filename') filename: string): Promise<{ success: boolean; message?: string; error?: string }> {
    try {
      await this.uploadService.deleteFile(filename);
      return {
        success: true,
        message: '文件删除成功',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || '文件删除失败',
      };
    }
  }

  @Get(':filename/download')
  @ApiOperation({ summary: '下载文件' })
  @ApiResponse({ status: HttpStatus.OK, description: '文件下载成功' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '文件不存在' })
  async downloadFile(@Param('filename') filename: string, @Res() res: Response): Promise<void> {
    try {
      const fileInfo = this.uploadService.getFileInfo(filename);

      if (!fileInfo) {
        res.status(HttpStatus.NOT_FOUND).json({
          success: false,
          error: '文件不存在',
        });
        return;
      }

      res.download(fileInfo.path, fileInfo.originalname);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: error.message || '文件下载失败',
      });
    }
  }
}
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as multer from 'multer';

export interface FileUploadOptions {
  maxSize?: number; // 字节
  allowedMimeTypes?: string[];
}

export interface UploadResult {
  url: string;
  filename: string;
  originalname: string;
  mimetype: string;
  size: number;
  path: string;
}

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    // 从配置获取上传目录和基础URL
    // 使用config.upload.path，配置在configuration.ts中定义
    const uploadConfig = this.configService.get('config.upload');
    this.uploadDir = path.resolve(uploadConfig?.path || './uploads');
    // 静态文件服务已配置serveRoot: '/uploads'，所以使用'/uploads'作为基础URL
    this.baseUrl = '/uploads';

    console.log('UploadService初始化完成，上传目录:', this.uploadDir);

    // 确保上传目录存在
    this.ensureUploadDir();
  }

  /**
   * 确保上传目录存在
   */
  private ensureUploadDir(): void {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * 获取文件存储配置
   */
  public getStorage(): multer.StorageEngine {
    return multer.diskStorage({
      destination: (_req, file, cb) => {
        cb(null, this.uploadDir);
      },
      filename: (_req, file, cb) => {
        // 生成唯一文件名: UUID + 时间戳 + 原始扩展名
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname);
        const filename = `${uuidv4()}-${uniqueSuffix}${ext}`;
        cb(null, filename);
      },
    });
  }

  /**
   * 获取文件过滤器
   */
  public getFileFilter(
    allowedMimeTypes: string[],
  ): multer.Options['fileFilter'] {
    return (_req, file, cb) => {
      if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`不支持的文件类型: ${file.mimetype}`) as any, false);
      }
    };
  }

  /**
   * 创建Multer实例
   */
  createMulterInstance(options: FileUploadOptions = {}): multer.Multer {
    const {
      maxSize = 10 * 1024 * 1024, // 默认10MB
      allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    } = options;

    return multer.default({
      storage: this.getStorage(),
      fileFilter: this.getFileFilter(allowedMimeTypes),
      limits: {
        fileSize: maxSize,
      },
    });
  }

  /**
   * 上传单个文件
   */
  async uploadFile(file: Express.Multer.File): Promise<UploadResult> {
    if (!file) {
      throw new BadRequestException('文件不能为空');
    }

    try {
      console.log(
        '上传文件:',
        file.originalname,
        '大小:',
        file.size,
        '类型:',
        file.mimetype,
      );
      if (!file.filename) {
        throw new BadRequestException('文件名不能为空');
      }
      const fileUrl = `${this.baseUrl}/${file.filename}`;
      const filePath = path.join(this.uploadDir, file.filename);

      return {
        url: fileUrl,
        filename: file.filename,
        originalname: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        path: filePath,
      };
    } catch (error) {
      // 如果上传失败，删除已保存的文件
      if (
        file?.path &&
        typeof file.path === 'string' &&
        fs.existsSync(file.path)
      ) {
        fs.unlinkSync(file.path);
      }
      throw new InternalServerErrorException(`文件上传失败: ${error.message}`);
    }
  }

  /**
   * 上传多个文件
   */
  async uploadFiles(files: Express.Multer.File[]): Promise<UploadResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('文件不能为空');
    }

    const results: UploadResult[] = [];
    const errors: Error[] = [];

    for (const file of files) {
      try {
        const result = await this.uploadFile(file);
        results.push(result);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      // 如果有错误，删除所有已上传的文件
      for (const result of results) {
        if (fs.existsSync(result.path)) {
          fs.unlinkSync(result.path);
        }
      }
      throw new InternalServerErrorException(
        `部分文件上传失败: ${errors.map((e) => e.message).join(', ')}`,
      );
    }

    return results;
  }

  /**
   * 删除文件
   */
  async deleteFile(filename: string): Promise<void> {
    const filePath = path.join(this.uploadDir, filename);

    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
      } catch (error) {
        throw new InternalServerErrorException(
          `文件删除失败: ${error.message}`,
        );
      }
    }
  }

  /**
   * 获取文件信息
   */
  getFileInfo(filename: string): UploadResult | null {
    const filePath = path.join(this.uploadDir, filename);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stats = fs.statSync(filePath);
    const ext = path.extname(filename);

    return {
      url: `${this.baseUrl}/${filename}`,
      filename,
      originalname: filename,
      mimetype: this.getMimeType(ext),
      size: stats.size,
      path: filePath,
    };
  }

  /**
   * 根据扩展名获取MIME类型
   */
  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.pdf': 'application/pdf',
    };

    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }

  /**
   * 创建图片上传的Multer实例
   */
  createImageUploader(): multer.Multer {
    return this.createMulterInstance({
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    });
  }

  /**
   * 创建视频上传的Multer实例
   */
  createVideoUploader(): multer.Multer {
    return this.createMulterInstance({
      maxSize: 100 * 1024 * 1024, // 100MB
      allowedMimeTypes: ['video/mp4', 'video/quicktime', 'video/x-msvideo'],
    });
  }

  /**
   * 创建通用文件上传的Multer实例
   */
  createGenericUploader(): multer.Multer {
    return this.createMulterInstance({
      maxSize: 50 * 1024 * 1024, // 50MB
      allowedMimeTypes: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'application/pdf',
        'text/plain',
      ],
    });
  }

  /**
   * 获取图片上传的Multer选项
   */
  getImageUploadOptions(): multer.Options {
    const options = {
      storage: this.getStorage(),
      fileFilter: this.getFileFilter([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    };
    return options;
  }

  /**
   * 获取视频上传的Multer选项
   */
  getVideoUploadOptions(): multer.Options {
    return {
      storage: this.getStorage(),
      fileFilter: this.getFileFilter([
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
      ]),
      limits: {
        fileSize: 100 * 1024 * 1024, // 100MB
      },
    };
  }

  /**
   * 获取通用文件上传的Multer选项
   */
  getGenericUploadOptions(): multer.Options {
    return {
      storage: this.getStorage(),
      fileFilter: this.getFileFilter([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/quicktime',
        'video/x-msvideo',
        'application/pdf',
        'text/plain',
      ]),
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
      },
    };
  }

  /**
   * 获取多个图片上传的Multer选项
   */
  getMultipleImagesUploadOptions(maxCount: number = 10): multer.Options {
    return {
      storage: this.getStorage(),
      fileFilter: this.getFileFilter([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
      ]),
      limits: {
        fileSize: 5 * 1024 * 1024, // 每个文件5MB
        files: maxCount,
      },
    };
  }
}

import { Controller, Get, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { MetricsService } from './metrics.service';
import { Response } from 'express';
import { ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller({ path: 'metrics', version: '1' })
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint() // 从Swagger文档中排除
  async getMetrics(@Res() res: Response): Promise<void> {
    try {
      const metrics = await this.metricsService.getMetrics();

      res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.send(metrics);
    } catch (error) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        code: 500,
        message: '获取指标失败',
        error: 'Internal Server Error',
      });
    }
  }

  @Get('health')
  @HttpCode(HttpStatus.OK)
  async getMetricsHealth(): Promise<{ status: string }> {
    try {
      await this.metricsService.getMetrics();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy' };
    }
  }
}

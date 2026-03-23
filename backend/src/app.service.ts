import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  private startTime = Date.now();

  getHello(): { message: string; timestamp: string; version: string } {
    return {
      message: 'Welcome to HR ERP Backend API',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  health(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      timestamp: new Date().toISOString(),
    };
  }
}

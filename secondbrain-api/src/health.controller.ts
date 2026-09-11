import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  check() {
    return {
      status: 'ok',
      message: 'Backend is alive',
      timestamp: new Date().toISOString(),
    };
  }
}

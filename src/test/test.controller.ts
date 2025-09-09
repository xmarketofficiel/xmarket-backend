import { Controller, Get } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';

@Controller('test')
export class TestController {
  constructor(private readonly adminService: AdminService) {}

  @Get('sellers')
  async testSellersData() {
    try {
      const result = await this.adminService.getSellerAnalytics(1, 10);
      return {
        success: true,
        data: result,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

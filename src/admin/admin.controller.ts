import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { AdminGuard } from '../common/guards/admin.guard';
import { SuperAdminGuard } from '../common/guards/super-admin.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import {
  AdminDashboardStats,
  AdminUserResponse,
  AdminItemResponse,
  AdminReportResponse,
  CreateAdminDto,
  CreateUserDto,
  CreateItemDto,
  UpdateUserStatusDto,
  BulkActionDto,
} from './dto/admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // Public test endpoint for seller data (remove in production)
  @Get('test-sellers')
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

  @UseGuards(AdminGuard)
  @Get('dashboard/stats')
  async getDashboardStats(): Promise<AdminDashboardStats> {
    return this.adminService.getDashboardStats();
  }

  @Get('analytics/overview')
  async getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  @Get('analytics/user-growth')
  async getUserGrowthAnalytics(@Query('days') days: number = 30) {
    return this.adminService.getUserGrowthAnalytics(days);
  }

  @Get('analytics/revenue')
  async getRevenueAnalytics(@Query('days') days: number = 30) {
    return this.adminService.getRevenueAnalytics(days);
  }

  @Get('analytics/item-performance')
  async getItemPerformanceAnalytics() {
    return this.adminService.getItemPerformanceAnalytics();
  }

  @Get('analytics/sellers')
  async getSellerAnalytics(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminService.getSellerAnalytics(page, limit);
  }

  @Get('users')
  async getAllUsers(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ): Promise<{ users: AdminUserResponse[]; total: number; page: number; limit: number }> {
    const pageNumber = page ? parseInt(page.toString(), 10) : 1;
    const limitNumber = limit ? parseInt(limit.toString(), 10) : 10;
    
    const result = await this.adminService.getAllUsers(
      pageNumber,
      limitNumber,
      search,
      role as any,
      status as any,
    );
    return { ...result, page: pageNumber, limit: limitNumber };
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<AdminUserResponse> {
    return this.adminService.getUserById(id);
  }

  @Get('users/:id/profile')
  async getUserProfile(@Param('id', ParseIntPipe) id: number): Promise<{
    user: AdminUserResponse;
    soldItems: AdminItemResponse[];
    boughtItems: AdminItemResponse[];
    stats: {
      totalSold: number;
      totalBought: number;
      totalRevenue: number;
      totalSpent: number;
      joinedDate: Date;
      lastActivity: Date;
    };
  }> {
    return this.adminService.getUserProfile(id);
  }

  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateUserStatusDto,
  ): Promise<AdminUserResponse> {
    return this.adminService.updateUserStatus(id, updateData);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.adminService.deleteUser(id);
  }

  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto): Promise<AdminUserResponse> {
    return this.adminService.createUser(createUserDto);
  }

  @Post('users/bulk-action')
  async bulkUserAction(@Body() bulkActionDto: BulkActionDto): Promise<{ success: number; failed: number }> {
    return this.adminService.bulkUserAction(bulkActionDto);
  }

  @Post('admins')
  @UseGuards(SuperAdminGuard)
  async createAdmin(@Body() createAdminDto: CreateAdminDto): Promise<AdminUserResponse> {
    return this.adminService.createAdmin(createAdminDto);
  }

  @Get('items')
  async getAllItems(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('search') search?: string,
  ): Promise<{ items: AdminItemResponse[]; total: number; page: number; limit: number }> {
    const pageNumber = page ? parseInt(page.toString(), 10) : 1;
    const limitNumber = limit ? parseInt(limit.toString(), 10) : 10;
    
    const result = await this.adminService.getAllItems(pageNumber, limitNumber, search);
    return { ...result, page: pageNumber, limit: limitNumber };
  }

  @Post('items')
  async createItem(@Body() createItemDto: CreateItemDto, @CurrentUser() currentAdmin: User): Promise<AdminItemResponse> {
    return this.adminService.createItem(createItemDto, currentAdmin.id);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.adminService.deleteItem(id);
  }

  @Get('reports')
  async getAllReports(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<{ reports: AdminReportResponse[]; total: number; page: number; limit: number }> {
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const result = await this.adminService.getAllReports(pageNumber, limitNumber);
    return { ...result, page: pageNumber, limit: limitNumber };
  }

  @Put('reports/:id/status')
  async updateReportStatus(
    @Param('id') id: string,
    @Body() updateData: { status: string; adminNotes?: string },
  ): Promise<{ success: boolean; message: string }> {
    await this.adminService.updateReportStatus(id, updateData.status, updateData.adminNotes);
    return { success: true, message: `Report ${updateData.status} successfully` };
  }

  @Get('me')
  async getCurrentAdmin(@CurrentUser() user: User): Promise<AdminUserResponse> {
    console.log('Admin /me endpoint called by user:', user.id, user.email);
    return this.adminService.getUserById(user.id);
  }

  // Category Management
  @Get('categories')
  async getAllCategories() {
    return this.adminService.getAllCategories();
  }

  @Post('categories')
  async createCategory(@Body() createCategoryDto: { name: string; icon?: string; description?: string }) {
    return this.adminService.createCategory(createCategoryDto);
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: { name?: string; icon?: string; description?: string; isActive?: boolean }
  ) {
    return this.adminService.updateCategory(id, updateCategoryDto);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // Admin-specific item image upload endpoint
  @Post('items/:id/images')
  @UseInterceptors(FilesInterceptor('images', 6, {
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB per file
    },
  }))
  async uploadItemImages(
    @Param('id', ParseIntPipe) itemId: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() adminUser: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return this.adminService.uploadItemImages(itemId, files, adminUser.id);
  }

  // Test endpoint
  @Get('test')
  async testAdminEndpoint(@CurrentUser() user: User) {
    return {
      success: true,
      message: 'Admin endpoint working',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      },
      timestamp: new Date().toISOString()
    };
  }
}

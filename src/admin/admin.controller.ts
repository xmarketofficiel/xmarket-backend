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
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
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
  CreateItemDto as AdminCreateItemDto,
  UpdateUserStatusDto,
  UpdateItemStatusDto,
  BulkActionDto,
} from './dto/admin.dto';

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('dashboard/stats')
  async getDashboardStats(): Promise<AdminDashboardStats> {
    return this.adminService.getDashboardStats();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('analytics/overview')
  async getAnalyticsOverview() {
    return this.adminService.getAnalyticsOverview();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('analytics/user-growth')
  async getUserGrowthAnalytics(@Query('days') days: number = 30) {
    return this.adminService.getUserGrowthAnalytics(days);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('analytics/revenue')
  async getRevenueAnalytics(@Query('days') days: number = 30) {
    return this.adminService.getRevenueAnalytics(days);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('analytics/item-performance')
  async getItemPerformanceAnalytics() {
    return this.adminService.getItemPerformanceAnalytics();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('analytics/sellers')
  async getSellerAnalytics(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ) {
    return this.adminService.getSellerAnalytics(page, limit);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
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

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('users/:id')
  async getUserById(@Param('id', ParseIntPipe) id: number): Promise<AdminUserResponse> {
    return this.adminService.getUserById(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
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

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('users/:id/status')
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateData: UpdateUserStatusDto,
  ): Promise<AdminUserResponse> {
    return this.adminService.updateUserStatus(id, updateData);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('users/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.adminService.deleteUser(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('users')
  async createUser(@Body() createUserDto: CreateUserDto): Promise<AdminUserResponse> {
    return this.adminService.createUser(createUserDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('users/bulk-action')
  async bulkUserAction(@Body() bulkActionDto: BulkActionDto): Promise<{ success: number; failed: number }> {
    return this.adminService.bulkUserAction(bulkActionDto);
  }

  @Post('admins')
  @UseGuards(SuperAdminGuard)
  async createAdmin(@Body() createAdminDto: CreateAdminDto): Promise<AdminUserResponse> {
    return this.adminService.createAdmin(createAdminDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
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

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('items')
  async createItem(@Body() createItemDto: AdminCreateItemDto, @CurrentUser() currentAdmin: User): Promise<AdminItemResponse> {
    return this.adminService.createItem(createItemDto, currentAdmin.id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteItem(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.adminService.deleteItem(id);
  }

  @Put('items/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateItemStatus(
    @Param('id', ParseIntPipe) id: number, 
    @Body() updateItemStatusDto: UpdateItemStatusDto
  ): Promise<AdminItemResponse> {
    return this.adminService.updateItemStatus(id, updateItemStatusDto.isActive, updateItemStatusDto.reason);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
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

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('reports/:id/status')
  async updateReportStatus(
    @Param('id') id: string,
    @Body() updateData: { status: string; adminNotes?: string },
  ): Promise<{ success: boolean; message: string }> {
    await this.adminService.updateReportStatus(id, updateData.status, updateData.adminNotes);
    return { success: true, message: `Report ${updateData.status} successfully` };
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('me')
  async getMe(@CurrentUser() user: any) {
    // Return current admin user info in consistent API format
    return {
      success: true,
      status: 200,
      message: 'Admin profile retrieved successfully',
      data: {
        id: user.id,
        name: user.fullName || user.email, // Use fullName or fallback to email
        email: user.email,
        role: user.isAdmin ? 'admin' : 'user',
        isAdmin: user.isAdmin
      }
    };
  }

  // Category Management
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('categories')
  async getAllCategories() {
    return this.adminService.getAllCategories();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post('categories')
  async createCategory(@Body() createCategoryDto: { name: string; icon?: string; description?: string }) {
    return this.adminService.createCategory(createCategoryDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() updateCategoryDto: { name?: string; icon?: string; description?: string; isActive?: boolean }
  ) {
    return this.adminService.updateCategory(id, updateCategoryDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    return this.adminService.deleteCategory(id);
  }

  // Admin-specific item image upload endpoint
  @UseGuards(JwtAuthGuard, AdminGuard)
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
}

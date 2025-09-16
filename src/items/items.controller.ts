import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseIntPipe, UseInterceptors, UploadedFiles, BadRequestException, UseGuards, Res } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { SearchItemsDto } from './dto/search-items.dto';
import { ReportItemDto } from './dto/report-item.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('items')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get all items with pagination and filters' })
  @ApiResponse({ status: 200, description: 'Items retrieved successfully' })
  async findAll(@Query() searchDto: SearchItemsDto) {
    const result = await this.itemsService.findAll(searchDto);
    return {
      success: true,
      data: result,
      message: 'Items retrieved successfully'
    };
  }

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Get all categories' })
  @ApiResponse({ status: 200, description: 'Categories retrieved successfully' })
  async getCategories() {
    const categories = await this.itemsService.getCategories();
    return {
      success: true,
      data: categories || [],
      message: 'Categories retrieved successfully'
    };
  }

  @Get('favorites')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user favorite items' })
  @ApiResponse({ status: 200, description: 'Favorites retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid pagination parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async getFavorites(
    @CurrentUser() user: User,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    // Safe parsing with defaults
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

    // Additional controller-level validation
    if (isNaN(page) || page < 1) {
      throw new BadRequestException('Page number must be a positive integer');
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    return this.itemsService.getUserFavorites(user.id, page, limit);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Get item by ID' })
  @ApiResponse({ status: 200, description: 'Item retrieved successfully' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.findOne(id);
  }

  @Public()
  @Post('seed')
  @ApiOperation({ summary: 'Seed test items' })
  @ApiResponse({ status: 201, description: 'Items seeded successfully' })
  async seedItems() {
    return this.itemsService.seedItems();
  }

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create new item' })
  @ApiResponse({ status: 201, description: 'Item created successfully' })
  async create(@Body() createItemDto: CreateItemDto, @CurrentUser() user: User) {
    return this.itemsService.create(createItemDto, user.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update item' })
  @ApiResponse({ status: 200, description: 'Item updated successfully' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemDto: UpdateItemDto,
    @CurrentUser() user: User,
  ) {
    const result = await this.itemsService.update(id, updateItemDto, user.id);
    
    // Return the full result including warning information
    return result;
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete item' })
  @ApiResponse({ status: 200, description: 'Item deleted successfully' })
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.itemsService.remove(id, user.id);
  }

  @Post(':id/images')
  @UseInterceptors(FilesInterceptor('images', 6, {
    fileFilter: (req, file, callback) => {
      if (!file.mimetype.match(/^image\/(jpeg|jpg|png|gif|webp)$/)) {
        return callback(new BadRequestException('Only image files are allowed'), false);
      }
      callback(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB per file
    }
  }))
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload item images to Cloudinary' })
  @ApiResponse({ status: 201, description: 'Images uploaded successfully' })
  async uploadImages(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @CurrentUser() user: User,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    
    return this.itemsService.uploadImages(id, files, user.id);
  }

  @Delete('images/:imageId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete item image' })
  @ApiResponse({ status: 200, description: 'Image deleted successfully' })
  async removeImage(
    @Param('imageId', ParseIntPipe) imageId: number,
    @CurrentUser() user: User,
  ) {
    return this.itemsService.removeImage(imageId, user.id);
  }

  @Post(':id/favorite')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle item favorite status' })
  @ApiResponse({ status: 200, description: 'Favorite status toggled successfully' })
  @ApiResponse({ status: 400, description: 'Invalid item ID or user cannot favorite own item' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async toggleFavorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    // Additional validation at controller level
    if (id <= 0) {
      throw new BadRequestException('Invalid item ID');
    }

    return this.itemsService.toggleFavorite(id, user.id);
  }

  @Get(':id/favorite')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check if item is favorited by user' })
  @ApiResponse({ status: 200, description: 'Favorite status retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid item ID' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async isFavorite(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    // Additional validation at controller level
    if (id <= 0) {
      throw new BadRequestException('Invalid item ID');
    }

    const isFavorite = await this.itemsService.isFavorite(id, user.id);
    return { isFavorite };
  }

  @Post(':id/report')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Report an item' })
  @ApiResponse({ status: 200, description: 'Item reported successfully' })
  async reportItem(
    @Param('id', ParseIntPipe) id: number,
    @Body() reportItemDto: ReportItemDto,
    @CurrentUser() user: User,
  ) {
    await this.itemsService.reportItem(id, user.id, reportItemDto.reason, reportItemDto.description);
    return { success: true, message: 'Item reported successfully' };
  }

  // ===============================
  // PURCHASE MANAGEMENT ENDPOINTS
  // ===============================

  @Post(':id/interest')
  @ApiOperation({ summary: 'Express interest in purchasing an item' })
  @ApiResponse({ status: 201, description: 'Interest expressed successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or already interested' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async expressInterest(
    @Param('id') idParam: string,
    @CurrentUser() user: User,
    @Body() body: { notes?: string }
  ) {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid item ID');
    }

    const purchase = await this.itemsService.expressInterest(id, user.id, body.notes);
    return {
      success: true,
      message: 'Interest expressed successfully',
      data: purchase
    };
  }

  @Post('purchases/:id/confirm')
  @ApiOperation({ summary: 'Confirm or decline purchase' })
  @ApiResponse({ status: 200, description: 'Purchase decision recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  async confirmPurchase(
    @Param('id') idParam: string,
    @CurrentUser() user: User,
    @Body() body: { confirmed: boolean; notes?: string }
  ) {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid purchase ID');
    }

    const purchase = await this.itemsService.confirmPurchase(id, user.id, body.confirmed, body.notes);
    return {
      success: true,
      message: body.confirmed ? 'Purchase confirmed successfully' : 'Purchase declined',
      data: purchase
    };
  }

  @Get('purchases/my-purchases')
  @ApiOperation({ summary: 'Get user\'s purchase history' })
  @ApiResponse({ status: 200, description: 'Purchase history retrieved successfully' })
  async getMyPurchases(
    @CurrentUser() user: User,
    @Query('status') status?: string
  ) {
    const purchases = await this.itemsService.getUserPurchases(user.id, status as any);
    return {
      success: true,
      data: purchases
    };
  }

  @Get('purchases/pending-confirmations')
  @ApiOperation({ summary: 'Get pending purchase confirmations' })
  @ApiResponse({ status: 200, description: 'Pending confirmations retrieved successfully' })
  async getPendingConfirmations(@CurrentUser() user: User) {
    const purchases = await this.itemsService.getPendingConfirmations(user.id);
    return {
      success: true,
      data: purchases
    };
  }

  @Post('purchases/:id/seller-confirm')
  @ApiOperation({ summary: 'Seller confirms or rejects buyer purchase' })
  @ApiResponse({ status: 200, description: 'Seller confirmation recorded successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - not waiting for seller confirmation' })
  @ApiResponse({ status: 403, description: 'Not authorized - not the seller' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  async sellerConfirmPurchase(
    @Param('id') idParam: string,
    @CurrentUser() user: User,
    @Body() body: { confirmed: boolean; notes?: string }
  ) {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid purchase ID');
    }

    const purchase = await this.itemsService.sellerConfirmPurchase(id, user.id, body.confirmed, body.notes);
    return {
      success: true,
      message: body.confirmed ? 'Sale confirmed successfully!' : 'Purchase request declined',
      data: purchase
    };
  }

  @Get('purchases/:id')
  @ApiOperation({ summary: 'Get purchase by ID' })
  @ApiResponse({ status: 200, description: 'Purchase retrieved successfully' })
  @ApiResponse({ status: 403, description: 'Not authorized to view this purchase' })
  @ApiResponse({ status: 404, description: 'Purchase not found' })
  async getPurchaseById(
    @Param('id') idParam: string,
    @CurrentUser() user: User
  ) {
    const id = parseInt(idParam, 10);
    if (isNaN(id)) {
      throw new BadRequestException('Invalid purchase ID');
    }

    const purchase = await this.itemsService.getPurchaseById(id, user.id);
    return {
      success: true,
      data: purchase
    };
  }

  @Get('sales/pending')
  @ApiOperation({ summary: 'Get pending sales for seller' })
  @ApiResponse({ status: 200, description: 'Pending sales retrieved successfully' })
  async getPendingSales(@CurrentUser() user: User) {
    const pendingSales = await this.itemsService.getPendingSales(user.id);
    return {
      success: true,
      data: pendingSales
    };
  }

  @Get('sales/my-listings')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seller items with quantity information' })
  @ApiResponse({ status: 200, description: 'Seller items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async getMyListings(
    @CurrentUser() user: User,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    // Safe parsing with defaults
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

    // Validation
    if (isNaN(page) || page < 1) {
      throw new BadRequestException('Page number must be a positive integer');
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.itemsService.getSellerItems(user.id, page, limit);
    return {
      success: true,
      data: result
    };
  }

  @Get('sales/my-editable')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get seller items that can be edited' })
  @ApiResponse({ status: 200, description: 'Editable items retrieved successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized - Authentication required' })
  async getMyEditableItems(
    @CurrentUser() user: User,
    @Query('page') pageParam?: string,
    @Query('limit') limitParam?: string,
  ) {
    // Safe parsing with defaults
    const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1;
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 20)) : 20;

    // Validation
    if (isNaN(page) || page < 1) {
      throw new BadRequestException('Page number must be a positive integer');
    }
    if (isNaN(limit) || limit < 1 || limit > 100) {
      throw new BadRequestException('Limit must be between 1 and 100');
    }

    const result = await this.itemsService.getEditableItems(user.id, page, limit);
    return {
      success: true,
      data: result
    };
  }
}
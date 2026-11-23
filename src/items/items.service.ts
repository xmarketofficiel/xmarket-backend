import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Item } from './entities/item.entity';
import { ItemImage } from './entities/item-image.entity';
import { ItemFavorite } from './entities/item-favorite.entity';
import { ItemReport } from './entities/item-report.entity';
import { ItemPurchase, PurchaseStatus } from './entities/item-purchase.entity';
import { Category } from '../categories/entities/category.entity';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { SearchItemsDto } from './dto/search-items.dto';
import { User } from '../users/entities/user.entity';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { DualImageService } from '../storage/dual-image.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

@Injectable()
export class ItemsService {
  constructor(
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    @InjectRepository(ItemImage)
    private itemImagesRepository: Repository<ItemImage>,
    @InjectRepository(ItemFavorite)
    private itemFavoritesRepository: Repository<ItemFavorite>,
    @InjectRepository(ItemReport)
    private itemReportsRepository: Repository<ItemReport>,
    @InjectRepository(ItemPurchase)
    private itemPurchasesRepository: Repository<ItemPurchase>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private cloudinaryService: CloudinaryService,
    private dualImageService: DualImageService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createItemDto: CreateItemDto, sellerId: number): Promise<Item> {
    const item = this.itemsRepository.create({
      ...createItemDto,
      sellerId,
    });
    return this.itemsRepository.save(item);
  }

  async findAll(searchDto: SearchItemsDto): Promise<{ 
    items: Item[]; 
    total: number; 
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    try {
      const { page = 1, limit = 12, category, minPrice, maxPrice, condition, search, sortBy = 'createdAt', sortOrder = 'DESC' } = searchDto;

      const query = this.itemsRepository.createQueryBuilder('item')
        .leftJoin('item.seller', 'seller')
        .addSelect([
          'seller.id',
          'seller.firstName',
          'seller.lastName',
          'seller.fullName',
          'seller.userRole',
          'seller.email',
          'seller.profileImageUrl',
          'seller.profileImageSpacesUrl',
          'seller.isVerified',
          'seller.showSoldItems',
          'seller.showPurchases'
        ])
        .leftJoinAndSelect('item.images', 'images')
        .where('item.isActive = :isActive', { isActive: true })
        .andWhere('item.isSold = :isSold', { isSold: false })
        .andWhere('item.quantity > :quantity', { quantity: 0 });
      

    if (category) {
      query.andWhere('item.category = :category', { category });
    }
    
    if (minPrice) {
      query.andWhere('item.price >= :minPrice', { minPrice });
    }
    
    if (maxPrice) {
      query.andWhere('item.price <= :maxPrice', { maxPrice });
    }
    
    if (condition) {
      query.andWhere('item.condition = :condition', { condition });
    }
    
    if (search) {
      query.andWhere('(item.title ILIKE :search OR item.description ILIKE :search)', 
        { search: `%${search}%` });
    }
      
    // Safe column mapping for sorting
    // Define safe column mapping
    const columnMap = {
      'createdAt': 'item.createdAt',
      'updatedAt': 'item.updatedAt',
      'price': 'item.price',
      'title': 'item.title',
      'viewCount': 'item.viewCount',
      'created_at': 'item.createdAt',
      'updated_at': 'item.updatedAt',
      'view_count': 'item.viewCount'
    };

    const orderByColumn = columnMap[sortBy] || columnMap['createdAt'];
    query.orderBy(orderByColumn, sortOrder.toUpperCase() as 'ASC' | 'DESC');
      
    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return { 
      items, 
      total, 
      page: Number(page),
      limit: Number(limit),
      totalPages,
      hasMore
    };
    } catch (error) {
      console.error('Error in findAll items service:', error);
      throw new Error(`Failed to fetch items: ${error.message}`);
    }
  }

  async findOne(id: number): Promise<Item> {
    const item = await this.itemsRepository
      .createQueryBuilder('item')
      .leftJoin('item.seller', 'seller')
      .addSelect([
        'seller.id',
        'seller.firstName',
        'seller.lastName',
        'seller.fullName',
          'seller.userRole',
        'seller.email',
        'seller.profileImageUrl',
        'seller.profileImageSpacesUrl',
        'seller.isVerified',
        'seller.showSoldItems',
        'seller.showPurchases',
        'seller.showPhone',
        'seller.whatsappNumber'
      ])
      .leftJoinAndSelect('item.images', 'images')
      .leftJoinAndSelect('item.interests', 'interests')
      .where('item.id = :id', { id })
      .getOne();

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    // Increment view count
    await this.itemsRepository.increment({ id }, 'viewCount', 1);

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto, userId: number): Promise<any> {
    const item = await this.findOne(id);
    
    // Protection 1: Only owner can edit
    if (item.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own items');
    }

    // Protection 2: Cannot edit sold items
    if (item.isSold) {
      throw new BadRequestException('Cannot edit sold items');
    }

    // Protection 3: Check for PENDING purchases (these should block edits)
    const pendingPurchases = await this.itemPurchasesRepository.find({
      where: { 
        itemId: id, 
        status: PurchaseStatus.PENDING
      }
    });

    // Only block for PENDING purchases (active negotiations)
    if (pendingPurchases.length > 0) {
      // Block quantity decrease below pending amount
      if (updateItemDto.quantity !== undefined && updateItemDto.quantity < pendingPurchases.length) {
        throw new BadRequestException(`Cannot reduce quantity below ${pendingPurchases.length}. You have ${pendingPurchases.length} pending purchase negotiations.`);
      }
    }

    // Check for confirmed purchases (for warnings, not blocking)
    const confirmedPurchases = await this.itemPurchasesRepository.find({
      where: { 
        itemId: id, 
        status: In([PurchaseStatus.CONFIRMED, PurchaseStatus.BUYER_CONFIRMED])
      }
    });

    // Check if there are actual meaningful changes
    const hasChanges = (
      (updateItemDto.title && updateItemDto.title.trim() !== item.title) ||
      (updateItemDto.description && updateItemDto.description.trim() !== item.description) ||
      (updateItemDto.price !== undefined && Math.abs(updateItemDto.price - item.price) > 0.01) ||
      (updateItemDto.quantity !== undefined && updateItemDto.quantity !== item.quantity) ||
      (updateItemDto.condition && updateItemDto.condition !== item.condition) ||
      (updateItemDto.category && updateItemDto.category !== item.category)
    );

    // Store warning info for response headers (only if there are changes AND confirmed purchases)
    let warningInfo = null;
    if (confirmedPurchases.length > 0 && hasChanges) {
      warningInfo = {
        confirmedBuyers: confirmedPurchases.length,
        agreedPrice: item.price,
        hasConfirmedPurchases: true
      };
    }

    // Protection 4: Validate price changes don't affect pending purchases
    if (updateItemDto.price && updateItemDto.price !== item.price) {
      const pendingPurchases = await this.itemPurchasesRepository.find({
        where: { itemId: id, status: PurchaseStatus.PENDING }
      });

      if (pendingPurchases.length > 0) {
        // Update agreed price for pending purchases to match new price
        for (const purchase of pendingPurchases) {
          purchase.agreedPrice = updateItemDto.price;
          await this.itemPurchasesRepository.save(purchase);
        }
      }
    }

    // Apply updates with validation (this logic is now handled above)
    const updatedFields = { ...updateItemDto };
    
    // Apply updates
    Object.assign(item, updatedFields);
    
    const updatedItem = await this.itemsRepository.save(item);

    // Notify interested buyers about significant changes
    if (updateItemDto.price || updateItemDto.description || updateItemDto.title) {
      const interestedBuyers = await this.itemPurchasesRepository.find({
        where: { itemId: id, status: PurchaseStatus.PENDING },
        relations: ['buyer']
      });

      for (const purchase of interestedBuyers) {
        if (purchase.buyer) {
          // You can add notification here if needed
          // await this.notificationsService.notifyItemUpdate(purchase.buyer, item.title);
        }
      }
    }

    // Return item with warning info if confirmed purchases exist
    return { 
      item: updatedItem, 
      warning: warningInfo,
      hasConfirmedPurchases: !!warningInfo
    };
  }

  async remove(id: number, userId: number): Promise<void> {
    const item = await this.findOne(id);
    
    if (item.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own items');
    }

    try {
      // Clean up all related data before deleting the item
      
      // 1. Remove all associated images from Cloudinary and database
      await this.removeAllItemImages(id);

      // 2. Remove all favorites
      await this.itemFavoritesRepository.delete({ item: { id } });

      // 3. Remove all reports
      await this.itemReportsRepository.delete({ item: { id } });

      // 4. Remove all purchase interests/expressions
      await this.itemPurchasesRepository.delete({ itemId: id });

      // 5. Finally, remove the item itself using delete instead of remove
      await this.itemsRepository.delete({ id });
      
    } catch (error) {
      console.error('Error during item deletion:', error);
      throw new InternalServerErrorException('Failed to delete item and its related data');
    }
  }

  async addImages(itemId: number, imageUrls: string[], userId: number): Promise<ItemImage[]> {
    const item = await this.findOne(itemId);
    
    if (item.sellerId !== userId) {
      throw new ForbiddenException('You can only add images to your own items');
    }

    const images = imageUrls.map((url, index) => 
      this.itemImagesRepository.create({
        itemId,
        imageUrl: url,
        imageOrder: index,
      })
    );

    return this.itemImagesRepository.save(images);
  }

  // New method for uploading images with dual storage (Cloudinary + DigitalOcean Spaces)
  async uploadImages(itemId: number, files: Express.Multer.File[], userId: number): Promise<ItemImage[]> {
    const item = await this.findOne(itemId);
    
    if (item.sellerId !== userId) {
      throw new ForbiddenException('You can only add images to your own items');
    }

    // Check current image count
    const existingImages = await this.itemImagesRepository.count({ where: { itemId } });
    const maxImages = 6; // Maximum images per item
    
    if (existingImages + files.length > maxImages) {
      throw new BadRequestException(`Maximum ${maxImages} images allowed per item. You already have ${existingImages} images.`);
    }

    try {
      // Upload images to both Cloudinary and DigitalOcean Spaces
      const uploadResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Use dual storage service for item images
        const uploadResult = await this.dualImageService.uploadImageToBothServices(
          file.buffer,
          userId,
          'item',
          file.originalname,
          itemId // Pass itemId for proper organization in /items/{itemId}/
        );
        
        uploadResults.push(uploadResult);
      }

      // Check for existing images with the same public ID to prevent duplicates
      const existingPublicIds = await this.itemImagesRepository.find({
        where: { itemId },
        select: ['cloudinaryPublicId']
      });
      const existingPublicIdSet = new Set(
        existingPublicIds
          .map(img => img.cloudinaryPublicId)
          .filter(Boolean)
      );

      // Create database records with both Cloudinary and Spaces URLs
      const images = uploadResults
        .filter((result, index) => {
          // Skip if this public ID already exists
          if (result.primary.publicId && existingPublicIdSet.has(result.primary.publicId)) {
            console.warn(`Skipping duplicate image with public ID: ${result.primary.publicId}`);
            return false;
          }
          return true;
        })
        .map((result, index) => {
          const imageRecord = {
            itemId,
            // Primary storage (Cloudinary)
            cloudinaryUrl: result.recommendedUrl,
            cloudinaryPublicId: result.primary.publicId,
            // Backup storage (DigitalOcean Spaces)
            spacesUrl: result.backup.spacesUrl,
            spacesKey: result.backup.spacesKey,
            // Image variants (thumbnail, small, medium, large)
            imageVariants: result.variants || {},
            // Legacy support
            imageUrl: result.recommendedUrl,
            publicId: result.primary.publicId,
            imageOrder: existingImages + index,
          };
          
          return this.itemImagesRepository.create(imageRecord);
        });

      const savedImages = await this.itemImagesRepository.save(images);
      
      return savedImages;
    } catch (error) {
      console.error('Failed to upload item images:', error);
      throw new BadRequestException('Failed to upload images: ' + error.message);
    }
  }

  // Admin-specific method that bypasses ownership checks
  async uploadImagesAsAdmin(itemId: number, files: Express.Multer.File[]): Promise<ItemImage[]> {
    const item = await this.findOne(itemId);
    // No ownership check for admin uploads

    // Check current image count
    const existingImages = await this.itemImagesRepository.count({ where: { itemId } });
    const maxImages = 6; // Maximum images per item
    
    if (existingImages + files.length > maxImages) {
      throw new BadRequestException(`Maximum ${maxImages} images allowed per item. You already have ${existingImages} images.`);
    }

    try {
      // Upload images to both services with variants (for admin uploads)
      const uploadResults = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Use dual storage service for admin item images too
        const uploadResult = await this.dualImageService.uploadImageToBothServices(
          file.buffer,
          0, // Admin user ID (could be made dynamic)
          'item',
          file.originalname,
          itemId
        );
        
        uploadResults.push(uploadResult);
      }

      // Check for existing images with the same public ID to prevent duplicates
      const existingPublicIds = await this.itemImagesRepository.find({
        where: { itemId },
        select: ['cloudinaryPublicId']
      });
      const existingPublicIdSet = new Set(
        existingPublicIds
          .map(img => img.cloudinaryPublicId)
          .filter(Boolean)
      );

      // Create database records with variants
      const images = uploadResults
        .filter((result, index) => {
          // Skip if this public ID already exists
          if (result.primary.publicId && existingPublicIdSet.has(result.primary.publicId)) {
            console.warn(`Skipping duplicate admin image with public ID: ${result.primary.publicId}`);
            return false;
          }
          return true;
        })
        .map((result, index) => 
          this.itemImagesRepository.create({
            itemId,
            // Primary storage (Cloudinary)
            cloudinaryUrl: result.recommendedUrl,
            cloudinaryPublicId: result.primary.publicId,
            // Backup storage (DigitalOcean Spaces)
            spacesUrl: result.backup.spacesUrl,
            spacesKey: result.backup.spacesKey,
            // Image variants (thumbnail, small, medium, large)
          imageVariants: result.variants || {},
          // Legacy support
          imageUrl: result.recommendedUrl,
          publicId: result.primary.publicId,
          imageOrder: existingImages + index,
        })
      );

      return this.itemImagesRepository.save(images);
    } catch (error) {
      throw new BadRequestException('Failed to upload images: ' + error.message);
    }
  }

  async removeImage(imageId: number, userId: number): Promise<void> {
    const image = await this.itemImagesRepository.findOne({
      where: { id: imageId },
      relations: ['item'],
    });

    if (!image) {
      throw new NotFoundException(`Image with ID ${imageId} not found`);
    }

    if (image.item.sellerId !== userId) {
      throw new ForbiddenException('You can only remove images from your own items');
    }

    // Delete from Cloudinary if publicId exists
    if (image.publicId) {
      try {
        await this.cloudinaryService.deleteImage(image.publicId);
      } catch (error) {
        console.error('Failed to delete image from Cloudinary:', error);
        // Continue with database deletion even if Cloudinary deletion fails
      }
    }

    await this.itemImagesRepository.remove(image);
  }

  // Method to delete all images when an item is deleted
  async removeAllItemImages(itemId: number): Promise<void> {
    const images = await this.itemImagesRepository.find({ where: { itemId } });
    
    if (images.length > 0) {
      const publicIds = images.filter(img => img.publicId).map(img => img.publicId);
      
      if (publicIds.length > 0) {
        try {
          await this.cloudinaryService.deleteMultipleImages(publicIds);
        } catch (error) {
          console.error('Failed to delete images from Cloudinary:', error);
          // Continue with database deletion
        }
      }
      
      await this.itemImagesRepository.remove(images);
    }
  }

  async getCategories(): Promise<Category[]> {
    try {
      // Get categories from the database with full objects
      const categories = await this.categoryRepository.find({
        where: { isActive: true },
        order: { name: 'ASC' }
      });

      // Return full category objects (id, name, icon, description, isActive)
      return (categories || []).filter(category => category.name.trim().toLowerCase() !== 'services');
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Return empty array instead of throwing to prevent frontend hanging
      return [];
    }
  }

  // Favorites functionality
  async toggleFavorite(itemId: number, userId: number): Promise<{ isFavorite: boolean }> {
    try {
      // Input validation and sanitization
      if (!itemId || itemId <= 0) {
        throw new BadRequestException('Invalid item ID provided');
      }
      
      if (!userId || userId <= 0) {
        throw new BadRequestException('Invalid user ID provided');
      }

      // Check if item exists and user has permission to favorite it
      const item = await this.itemsRepository.findOne({ 
        where: { id: itemId },
        select: ['id', 'title', 'sellerId'] // Only select necessary fields
      });
      
      if (!item) {
        throw new NotFoundException('Item not found or has been removed');
      }

      // Prevent users from favoriting their own items
      if (item.sellerId === userId) {
        throw new BadRequestException('You cannot favorite your own items');
      }

      const user = { id: userId } as User;

      const existingFavorite = await this.itemFavoritesRepository.findOne({
        where: { user, item }
      });

      if (existingFavorite) {
        // Remove from favorites
        await this.itemFavoritesRepository.remove(existingFavorite);
        return { isFavorite: false };
      } else {
        // Add to favorites with duplicate check
        const favorite = this.itemFavoritesRepository.create({ user, item });
        try {
          await this.itemFavoritesRepository.save(favorite);
        } catch (dbError) {
          // Handle potential duplicate key constraint violations
          if (dbError.code === '23505') { // PostgreSQL unique violation
            return { isFavorite: true }; // Already favorited by concurrent request
          }
          throw dbError;
        }
        return { isFavorite: true };
      }
    } catch (error) {
      console.error(`[toggleFavorite] Error for item ${itemId}, user ${userId}:`, error);
      
      // Re-throw known exceptions
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      
      // For database errors, return safe error
      throw new InternalServerErrorException('Unable to update favorite status at this time');
    }
  }

  async isFavorite(itemId: number, userId: number): Promise<boolean> {
    try {
      // Input validation
      if (!itemId || itemId <= 0 || !userId || userId <= 0) {
        return false; // Invalid inputs should return false, not error
      }

      const user = { id: userId } as User;
      const item = { id: itemId } as Item;
      
      const existingFavorite = await this.itemFavoritesRepository.findOne({
        where: { user, item }
      });

      return !!existingFavorite;
    } catch (error) {
      console.error(`[isFavorite] Error for item ${itemId}, user ${userId}:`, error);
      // For this method, return false on error rather than throwing
      // This prevents UI from breaking when checking favorite status
      return false;
    }
  }

  async getUserFavorites(userId: number, page: number = 1, limit: number = 20) {
    try {
      // Input validation and sanitization
      if (!userId || userId <= 0) {
        throw new BadRequestException('Invalid user ID provided');
      }
      
      // Validate pagination parameters
      const validatedPage = Math.max(1, Math.floor(page));
      const validatedLimit = Math.min(100, Math.max(1, Math.floor(limit))); // Max 100 items per page for security

      const user = { id: userId } as User;
      
      // Use QueryBuilder to select only safe seller fields
      const [favorites, total] = await this.itemFavoritesRepository
        .createQueryBuilder('favorite')
        .leftJoinAndSelect('favorite.item', 'item')
        .leftJoin('item.seller', 'seller')
        .addSelect([
          'seller.id',
          'seller.fullName',
          'seller.userRole',
          'seller.firstName',
          'seller.lastName',
          'seller.email',
          'seller.profileImageUrl',
          'seller.profileImageSpacesUrl',
          'seller.isVerified'
        ])
        .leftJoinAndSelect('item.images', 'images')
        .where('favorite.userId = :userId', { userId })
        .orderBy('favorite.createdAt', 'DESC')
        .take(validatedLimit)
        .skip((validatedPage - 1) * validatedLimit)
        .getManyAndCount();

      // Safely extract items with null checks
      const items = favorites
        .filter(favorite => favorite && favorite.item)
        .map(favorite => favorite.item);

      return {
        success: true,
        data: items,
        pagination: {
          page: validatedPage,
          limit: validatedLimit,
          total,
          pages: Math.ceil(total / validatedLimit),
        },
      };
    } catch (error) {
      console.error(`[getUserFavorites] Error for user ${userId}:`, error);
      
      // Return different responses based on error type
      if (error instanceof BadRequestException) {
        throw error; // Re-throw validation errors
      }
      
      // For database errors, return safe error
      throw new InternalServerErrorException('Unable to retrieve favorites at this time');
    }
  }

  // Report functionality
  async reportItem(itemId: number, userId: number, reason: string, description?: string): Promise<void> {
    const user = { id: userId } as User;
    const item = await this.itemsRepository.findOne({ where: { id: itemId } });
    
    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Check if user already reported this item
    const existingReport = await this.itemReportsRepository.findOne({
      where: { reporter: user, item }
    });

    if (existingReport) {
      throw new ForbiddenException('You have already reported this item');
    }

    // Use the provided reason and description directly
    const report = this.itemReportsRepository.create({
      reporter: user,
      item,
      reason: reason.trim(),
      description: description?.trim() || null,
    });

    await this.itemReportsRepository.save(report);
  }


  // ===============================
  // PURCHASE MANAGEMENT METHODS
  // ===============================

  /**
   * Express interest in purchasing an item
   */
  async expressInterest(itemId: number, userId: number, buyerNotes?: string): Promise<ItemPurchase> {
    // Input validation
    if (!itemId || !userId) {
      throw new BadRequestException('Item ID and User ID are required');
    }

    // Check if item exists and is available
    const item = await this.itemsRepository.findOne({
      where: { id: itemId },
      relations: ['seller']
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    if (item.isSold) {
      throw new BadRequestException('This item has already been sold');
    }

    // Prevent self-purchase
    if (item.sellerId === userId) {
      throw new BadRequestException('You cannot purchase your own items');
    }

    // Check for existing purchases and handle multiple interests
    const existingPurchase = await this.itemPurchasesRepository.findOne({
      where: { itemId, buyerId: userId },
      order: { createdAt: 'DESC' }
    });

    if (existingPurchase) {
      // If there's an existing purchase, always allow renewed interest
      const timestamp = new Date().toISOString();
      const renewedNotes = `${buyerNotes || 'Renewed interest'} [Renewed at: ${timestamp}]`;
      
      // Update existing record with new notes and renewed interest indication
      existingPurchase.buyerNotes = renewedNotes;
      existingPurchase.status = PurchaseStatus.PENDING; // Reset to pending for seller to see
      existingPurchase.updatedAt = new Date();
      
      const savedPurchase = await this.itemPurchasesRepository.save(existingPurchase);

      // Notify seller about renewed interest
      const buyer = await this.itemsRepository.manager.findOne(User, { where: { id: userId } });
      
      if (item?.seller && buyer) {
        await this.notificationsService.notifyItemInterest(
          item.seller,
          `${buyer.fullName || 'Someone'} (RENEWED INTEREST)`,
          item.title
        );
      }

      return savedPurchase;
    }

    // No existing purchase or existing purchase is completed - create new one
    const newPurchase = this.itemPurchasesRepository.create({
      itemId,
      buyerId: userId,
      status: PurchaseStatus.PENDING,
      buyerNotes,
      agreedPrice: item.price,
    });

    try {
      const savedPurchase = await this.itemPurchasesRepository.save(newPurchase);

      // Notify the seller about the new interest
      const buyer = await this.itemsRepository.manager.findOne(User, { where: { id: userId } });
      
      if (item?.seller && buyer) {
        await this.notificationsService.notifyItemInterest(
          item.seller,
          buyer.fullName || 'Someone',
          item.title
        );
      }

      return savedPurchase;
    } catch (error) {
      // If there's still a unique constraint issue at database level, handle it gracefully
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new BadRequestException('You have already expressed interest in this item. Please wait for seller response.');
      }
      throw error;
    }

    // Create new purchase interest
    try {
      const purchase = this.itemPurchasesRepository.create({
        itemId,
        buyerId: userId,
        status: PurchaseStatus.PENDING,
        buyerNotes: buyerNotes || '',
        agreedPrice: item.price
      });

      const savedPurchase = await this.itemPurchasesRepository.save(purchase);
      
      // Get buyer information for notification
      const buyer = await this.itemsRepository.manager.findOne(User, { where: { id: userId } });
      
      // Notify seller that someone is interested
      if (item.seller && buyer) {
        await this.notificationsService.notifyItemInterest(
          item.seller,
          buyer.fullName || 'Someone',
          item.title
        );
      }

      return savedPurchase;
    } catch (error) {
      console.error('Error expressing interest:', error);
      throw new InternalServerErrorException('Failed to express interest in item');
    }
  }

  /**
   * Confirm or decline purchase (buyer's decision)
   */
  async confirmPurchase(purchaseId: number, userId: number, confirmed: boolean, notes?: string): Promise<ItemPurchase> {
    const purchase = await this.itemPurchasesRepository.findOne({
      where: { id: purchaseId },
      relations: ['item', 'item.seller', 'buyer']
    });

    if (!purchase) {
      throw new NotFoundException('Purchase record not found');
    }

    if (purchase.buyerId !== userId) {
      throw new ForbiddenException('You are not authorized to modify this purchase');
    }

    if (purchase.status !== PurchaseStatus.PENDING) {
      throw new BadRequestException('This purchase has already been processed');
    }

    try {
      if (confirmed) {
        // NEW: When buyer confirms, set to BUYER_CONFIRMED status first
        purchase.status = PurchaseStatus.BUYER_CONFIRMED;
        purchase.confirmedAt = new Date();
        // DON'T mark item as sold yet - wait for seller confirmation
        
        // Notify seller that buyer confirmed and needs seller confirmation
        if (purchase.item?.seller) {
          await this.notificationsService.createNotification(
            purchase.item.seller,
            NotificationType.PURCHASE_CONFIRMATION,
            'Purchase Confirmation Needed',
            `${purchase.buyer.fullName} confirmed they bought your item "${purchase.item.title}". Please confirm this sale.`,
            { 
              itemId: purchase.item.id,
              purchaseId: purchase.id,
              buyerName: purchase.buyer.fullName 
            }
          );
        }
      } else {
        purchase.status = PurchaseStatus.DECLINED;
      }

      purchase.buyerNotes = notes || purchase.buyerNotes;
      purchase.updatedAt = new Date();

      return await this.itemPurchasesRepository.save(purchase);
    } catch (error) {
      console.error('Error confirming purchase:', error);
      throw new InternalServerErrorException('Failed to process purchase confirmation');
    }
  }

  /**
   * Seller confirms or rejects the purchase (seller's decision after buyer confirmation)
   */
  async sellerConfirmPurchase(purchaseId: number, sellerId: number, confirmed: boolean, notes?: string): Promise<ItemPurchase> {
    const purchase = await this.itemPurchasesRepository.findOne({
      where: { id: purchaseId },
      relations: ['item', 'item.seller', 'buyer']
    });

    if (!purchase) {
      throw new NotFoundException('Purchase record not found');
    }

    if (purchase.item.sellerId !== sellerId) {
      throw new ForbiddenException('You are not authorized to confirm this purchase');
    }

    if (purchase.status !== PurchaseStatus.BUYER_CONFIRMED) {
      throw new BadRequestException('This purchase is not waiting for seller confirmation');
    }

    try {
      if (confirmed) {
        // Final confirmation - mark as completed
        purchase.status = PurchaseStatus.CONFIRMED;
        purchase.sellerConfirmedAt = new Date();
        
        // Decrease quantity by 1
        const item = await this.itemsRepository.findOne({ where: { id: purchase.itemId } });
        if (!item) {
          throw new NotFoundException('Item not found');
        }
        
        const newQuantity = item.quantity - 1;
        
        // Update item quantity and check if should be marked as sold
        if (newQuantity <= 0) {
          // Mark as sold when quantity reaches 0
          await this.itemsRepository.update(purchase.itemId, { 
            quantity: 0, 
            isSold: true 
          });
        } else {
          // Just decrease quantity
          await this.itemsRepository.update(purchase.itemId, { 
            quantity: newQuantity 
          });
        }
        
        // Notify buyer that seller confirmed the sale
        if (purchase.buyer) {
          await this.notificationsService.createNotification(
            purchase.buyer,
            NotificationType.ITEM_SOLD,
            'Purchase Confirmed!',
            `The seller confirmed your purchase of "${purchase.item.title}". Sale is now complete!`,
            { 
              itemId: purchase.item.id,
              purchaseId: purchase.id,
              sellerName: purchase.item.seller.fullName 
            }
          );
        }
      } else {
        // Seller rejected the purchase - mark as declined
        purchase.status = PurchaseStatus.DECLINED;
        
        // Notify buyer that seller declined the purchase
        if (purchase.buyer) {
          await this.notificationsService.createNotification(
            purchase.buyer,
            NotificationType.SYSTEM,
            'Purchase Declined',
            `The seller declined your purchase of "${purchase.item.title}". The item is still available for purchase.`,
            { 
              itemId: purchase.item.id,
              purchaseId: purchase.id 
            }
          );
        }
      }

      purchase.sellerNotes = notes || purchase.sellerNotes;
      purchase.updatedAt = new Date();

      return await this.itemPurchasesRepository.save(purchase);
    } catch (error) {
      console.error('Error in seller confirmation:', error);
      throw new InternalServerErrorException('Failed to process seller confirmation');
    }
  }

  /**
   * Get user's purchase history
   */
  async getUserPurchases(userId: number, status?: PurchaseStatus): Promise<ItemPurchase[]> {
    const whereCondition: any = { buyerId: userId };
    if (status) {
      whereCondition.status = status;
    }

    return await this.itemPurchasesRepository.find({
      where: whereCondition,
      relations: ['item', 'item.images', 'item.seller'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get pending purchase confirmations for a user (buyer needs to confirm their interest)
   */
  async getPendingConfirmations(userId: number): Promise<ItemPurchase[]> {
    return await this.itemPurchasesRepository.find({
      where: { 
        buyerId: userId, 
        status: PurchaseStatus.PENDING 
      },
      relations: ['item', 'item.images', 'item.seller'],
      order: { createdAt: 'DESC' }
    });
  }

  /**
   * Get purchase by ID (for notifications/seller dashboard)
   */
  async getPurchaseById(purchaseId: number, userId: number): Promise<ItemPurchase> {
    const purchase = await this.itemPurchasesRepository.findOne({
      where: { id: purchaseId },
      relations: ['item', 'item.images', 'item.seller', 'buyer']
    });

    if (!purchase) {
      throw new NotFoundException('Purchase record not found');
    }

    // Check if user is either the buyer or seller
    if (purchase.buyerId !== userId && purchase.item.sellerId !== userId) {
      throw new ForbiddenException('You are not authorized to view this purchase');
    }

    return purchase;
  }

  /**
   * Get pending sales for a seller (where user is the seller and has pending purchase confirmations)
   */
  async getPendingSales(sellerId: number): Promise<ItemPurchase[]> {
    return await this.itemPurchasesRepository
      .createQueryBuilder('purchase')
      .leftJoinAndSelect('purchase.item', 'item')
      .leftJoinAndSelect('item.images', 'images')
      .leftJoinAndSelect('purchase.buyer', 'buyer')
      .where('item.sellerId = :sellerId', { sellerId })
      .andWhere('purchase.status = :status', { status: PurchaseStatus.BUYER_CONFIRMED })
      .orderBy('purchase.createdAt', 'DESC')
      .getMany();
  }

  /**
   * Get seller's items with available quantity information
   */
  async getSellerItems(sellerId: number, page: number = 1, limit: number = 20): Promise<{
    items: Array<Item & { availableQuantity: number; totalSold: number; pendingPurchases: number }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    // Get seller's items with images
    const [items, total] = await this.itemsRepository.findAndCount({
      where: { sellerId },
      relations: ['images'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // For each item, calculate available quantity, total sold, and pending purchases
    const itemsWithQuantity = await Promise.all(
      items.map(async (item) => {
        // Count completed purchases (sold items)
        const totalSold = await this.itemPurchasesRepository.count({
          where: {
            itemId: item.id,
            status: PurchaseStatus.COMPLETED,
          },
        });

        // Count pending and confirmed purchases (reserved but not yet completed)
        const pendingPurchases = await this.itemPurchasesRepository.count({
          where: {
            itemId: item.id,
            status: In([PurchaseStatus.PENDING, PurchaseStatus.BUYER_CONFIRMED, PurchaseStatus.CONFIRMED]),
          },
        });

        // Calculate available quantity
        const availableQuantity = Math.max(0, item.quantity - totalSold - pendingPurchases);

        return {
          ...item,
          availableQuantity,
          totalSold,
          pendingPurchases,
        };
      })
    );

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      items: itemsWithQuantity,
      total,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * Get seller's editable items (items that can still be modified)
   * Only includes items that haven't been sold and don't have confirmed purchases
   */
  async getEditableItems(sellerId: number, page: number = 1, limit: number = 20): Promise<{
    items: Array<Item & { availableQuantity: number; totalSold: number; pendingPurchases: number }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * limit;

    // Get seller's items that are not sold
    const [items, total] = await this.itemsRepository.findAndCount({
      where: { 
        sellerId,
        isSold: false,
      },
      relations: ['images'],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Filter out items with confirmed purchases and calculate quantities
    const editableItems = [];
    
    for (const item of items) {
      // Count confirmed purchases (these make items non-editable)
      const confirmedPurchases = await this.itemPurchasesRepository.count({
        where: {
          itemId: item.id,
          status: In([PurchaseStatus.BUYER_CONFIRMED, PurchaseStatus.CONFIRMED]),
        },
      });

      // Only include items without confirmed purchases
      if (confirmedPurchases === 0) {
        // Count completed purchases (sold items)
        const totalSold = await this.itemPurchasesRepository.count({
          where: {
            itemId: item.id,
            status: PurchaseStatus.COMPLETED,
          },
        });

        // Count pending purchases
        const pendingPurchases = await this.itemPurchasesRepository.count({
          where: {
            itemId: item.id,
            status: PurchaseStatus.PENDING,
          },
        });

        // Calculate available quantity
        const availableQuantity = Math.max(0, item.quantity - totalSold - pendingPurchases);

        editableItems.push({
          ...item,
          availableQuantity,
          totalSold,
          pendingPurchases,
        });
      }
    }

    const totalEditable = editableItems.length;
    const totalPages = Math.ceil(totalEditable / limit);
    const hasMore = page < totalPages;

    return {
      items: editableItems,
      total: totalEditable,
      page,
      limit,
      totalPages,
      hasMore,
    };
  }

  /**
   * Seed test items for development
   */
  async seedItems() {
    const categories = await this.categoryRepository.find();
    if (categories.length === 0) {
      throw new Error('No categories found. Please seed categories first.');
    }

    const sampleItems = [
      {
        title: 'MacBook Pro 2023',
        description: 'Like new MacBook Pro with M2 chip, 16GB RAM, 512GB SSD. Perfect for students.',
        price: 1500,
        condition: 'Like New',
        category: 'Electronics',
      },
      {
        title: 'Calculus Textbook',
        description: 'Stewart Calculus 8th Edition. Excellent condition, no highlighting.',
        price: 50,
        condition: 'Good',
        category: 'Books',
      },
      {
        title: 'Desk Chair',
        description: 'Ergonomic office chair, perfect for studying. Adjustable height.',
        price: 80,
        condition: 'Good',
        category: 'Furniture',
      },
      {
        title: 'Basketball',
        description: 'Official size basketball, barely used.',
        price: 25,
        condition: 'Like New',
        category: 'Sports',
      },
      {
        title: 'Winter Jacket',
        description: 'Warm winter jacket, size M. Great for cold weather.',
        price: 60,
        condition: 'Good',
        category: 'Clothing',
      },
    ];

    const savedItems = [];
    for (const itemData of sampleItems) {
      const category = categories.find(cat => cat.name === itemData.category);
      if (category) {
        const item = this.itemsRepository.create({
          title: itemData.title,
          description: itemData.description,
          price: itemData.price,
          condition: itemData.condition,
          category: category.name,
          sellerId: 1, // Default to first user
          quantity: 1,
          isSold: false,
          isActive: true,
        });
        const saved = await this.itemsRepository.save(item);
        savedItems.push(saved);
      }
    }

    return {
      success: true,
      message: `Seeded ${savedItems.length} items`,
      data: savedItems,
    };
  }
}

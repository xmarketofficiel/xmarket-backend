import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
        .leftJoinAndSelect('item.seller', 'seller')
        .leftJoinAndSelect('item.images', 'images')
        .where('item.isActive = :isActive', { isActive: true })
        .andWhere('item.isSold = :isSold', { isSold: false });
      

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
    const item = await this.itemsRepository.findOne({
      where: { id },
      relations: ['seller', 'images', 'interests'],
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${id} not found`);
    }

    // Increment view count
    await this.itemsRepository.increment({ id }, 'viewCount', 1);

    return item;
  }

  async update(id: number, updateItemDto: UpdateItemDto, userId: number): Promise<Item> {
    const item = await this.findOne(id);
    
    if (item.sellerId !== userId) {
      throw new ForbiddenException('You can only update your own items');
    }

    Object.assign(item, updateItemDto);
    return this.itemsRepository.save(item);
  }

  async remove(id: number, userId: number): Promise<void> {
    const item = await this.findOne(id);
    
    if (item.sellerId !== userId) {
      throw new ForbiddenException('You can only delete your own items');
    }

    // First, remove all associated images from Cloudinary and database
    await this.removeAllItemImages(id);

    await this.itemsRepository.remove(item);
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

  // New method for uploading images with Cloudinary
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
      // Upload all images to Cloudinary with backend processing (using legacy compatibility method)
      const uploadResults = await this.cloudinaryService.uploadMultipleImagesLegacy(files, `marketplace-items/item-${itemId}`);
      
      // Create database records
      const images = uploadResults.map((result, index) => 
        this.itemImagesRepository.create({
          itemId,
          imageUrl: result.url,
          publicId: result.publicId,
          imageOrder: existingImages + index,
        })
      );

      return this.itemImagesRepository.save(images);
    } catch (error) {
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
      // Upload all images to Cloudinary with backend processing (using legacy compatibility method)
      const uploadResults = await this.cloudinaryService.uploadMultipleImagesLegacy(files, `marketplace-items/item-${itemId}`);
      
      // Create database records
      const images = uploadResults.map((result, index) => 
        this.itemImagesRepository.create({
          itemId,
          imageUrl: result.url,
          publicId: result.publicId,
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
    // Get categories from the database with full objects
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' }
    });

    // Return full category objects (id, name, icon, description, isActive)
    return categories;
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
      
      // Use try-catch for database operations
      const [favorites, total] = await this.itemFavoritesRepository.findAndCount({
        where: { user },
        relations: ['item', 'item.seller', 'item.images'],
        order: { createdAt: 'DESC' },
        take: validatedLimit,
        skip: (validatedPage - 1) * validatedLimit,
      });

      // Safely extract items with null checks
      const items = favorites
        .filter(favorite => favorite && favorite.item) // Filter out corrupted data
        .map(favorite => {
          const item = favorite.item;
          // Safely handle seller information (remove sensitive fields if they exist)
          if (item.seller) {
            // Create a safe version without potentially sensitive fields
            const { ...safeSeller } = item.seller;
            // Remove any authentication-related fields that might exist
            delete (safeSeller as any).password;
            delete (safeSeller as any).resetToken;
            delete (safeSeller as any).emailVerificationToken;
            item.seller = safeSeller;
          }
          return item;
        });

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
  async reportItem(itemId: number, userId: number, reason: string): Promise<void> {
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

    const report = this.itemReportsRepository.create({
      reporter: user,
      item,
      reason,
    });

    await this.itemReportsRepository.save(report);
  }

  async seedItems(): Promise<{ success: boolean; message: string }> {
    // Create a test user with a simple password for testing
    // In production, this would be properly hashed
    const testUser = await this.itemsRepository.manager.query(
      `INSERT INTO users (full_name, email, whatsapp_number, password_hash, is_verified) 
       VALUES ($1, $2, $3, $4, $5) 
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = $4,
         is_verified = $5,
         full_name = $1
       RETURNING id`,
      ['Test User', 'test@example.com', '+1234567890', '$2a$10$6MiAlfPlTiJ9JhhFRYSoQu3wQKaW4xeSEwgZaPx1CcWrHJvKtu/Ra', true] // password123
    );

    const userId = testUser[0]?.id || 1;

    // Get categories
    const categories = await this.itemsRepository.manager.query('SELECT id FROM categories LIMIT 6');
    
    const sampleItems = [
      {
        title: 'MacBook Pro 13" 2023',
        description: 'Excellent condition MacBook Pro with M2 chip, 256GB storage. Perfect for students and professionals.',
        price: 1299.99,
        category: categories[0]?.id || 'electronics',
        condition: 'excellent',
        sellerId: userId,
      },
      {
        title: 'Organic Chemistry Textbook',
        description: 'Latest edition organic chemistry textbook. Used for one semester, great condition.',
        price: 89.50,
        category: categories[1]?.id || 'books',
        condition: 'good',
        sellerId: userId,
      },
      {
        title: 'Gaming Chair',
        description: 'Comfortable ergonomic gaming chair with lumbar support. Black with RGB lighting.',
        price: 199.99,
        category: categories[2]?.id || 'furniture',
        condition: 'good',
        sellerId: userId,
      },
      {
        title: 'Nike Air Max Sneakers',
        description: 'Size 9 Nike Air Max sneakers in great condition. Worn only a few times.',
        price: 75.00,
        category: categories[3]?.id || 'clothing',
        condition: 'excellent',
        sellerId: userId,
      },
      {
        title: 'iPhone 14',
        description: 'Unlocked iPhone 14 in space gray. 128GB storage, comes with original box and charger.',
        price: 649.99,
        category: categories[0]?.id || 'electronics',
        condition: 'like_new',
        sellerId: userId,
      },
      {
        title: 'Calculus Study Guide',
        description: 'Comprehensive calculus study guide with practice problems and solutions.',
        price: 25.00,
        category: categories[1]?.id || 'books',
        condition: 'good',
        sellerId: userId,
      },
    ];

    // Insert items
    for (const itemData of sampleItems) {
      await this.itemsRepository.save(itemData);
    }

    return { success: true, message: `${sampleItems.length} test items created successfully` };
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

    // Check for existing purchase attempt
    const existingPurchase = await this.itemPurchasesRepository.findOne({
      where: { itemId, buyerId: userId }
    });

    if (existingPurchase) {
      if (existingPurchase.status === PurchaseStatus.DECLINED) {
        existingPurchase.status = PurchaseStatus.PENDING;
        existingPurchase.buyerNotes = buyerNotes || existingPurchase.buyerNotes;
        existingPurchase.updatedAt = new Date();
        return await this.itemPurchasesRepository.save(existingPurchase);
      } else {
        throw new BadRequestException('You have already expressed interest in this item');
      }
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
        // Final confirmation - mark as completed and item as sold
        purchase.status = PurchaseStatus.CONFIRMED;
        purchase.sellerConfirmedAt = new Date();
        await this.itemsRepository.update(purchase.itemId, { isSold: true });
        
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
   * Get pending purchase confirmations for a user (buyer waiting for seller confirmation)
   */
  async getPendingConfirmations(userId: number): Promise<ItemPurchase[]> {
    return await this.itemPurchasesRepository.find({
      where: { 
        buyerId: userId, 
        status: PurchaseStatus.BUYER_CONFIRMED 
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
}
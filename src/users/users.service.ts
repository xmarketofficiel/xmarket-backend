import { Injectable, NotFoundException, ForbiddenException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { UserFollow } from './entities/user-follow.entity';
import { UserBlock } from './entities/user-block.entity';
import { UserReport } from './entities/user-report.entity';
import { Item } from '../items/entities/item.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CloudinaryService } from '../common/services/cloudinary.service';
import { DualImageService } from '../storage/dual-image.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(UserFollow)
    private userFollowsRepository: Repository<UserFollow>,
    @InjectRepository(UserBlock)
    private userBlocksRepository: Repository<UserBlock>,
    @InjectRepository(UserReport)
    private userReportsRepository: Repository<UserReport>,
    @InjectRepository(Item)
    private itemsRepository: Repository<Item>,
    private cloudinaryService: CloudinaryService,
    private dualImageService: DualImageService,
  ) {}

  async create(createUserDto: CreateUserDto & { isVerified?: boolean }): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    // Normalize email to lowercase for consistent storage
    const normalizedEmail = createUserDto.email.toLowerCase().trim();
    const user = this.usersRepository.create({
      ...createUserDto,
      email: normalizedEmail, // Store normalized email
      passwordHash: hashedPassword,
      isVerified: createUserDto.isVerified || false,
    });
    return this.usersRepository.save(user);
  }

  async findAll(): Promise<User[]> {
    return this.usersRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | undefined> {
    // Normalize email to lowercase for consistent lookup
    const normalizedEmail = email.toLowerCase().trim();
    return this.usersRepository.findOne({ where: { email: normalizedEmail } });
  }

  async updateLastLogin(userId: number): Promise<void> {
    await this.usersRepository.update(userId, {
      lastLogin: new Date(),
    });
  }

  async update(id: number, updateUserDto: UpdateUserDto & { isVerified?: boolean }): Promise<User> {
    const user = await this.findOne(id);
    
    if (updateUserDto.password) {
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Handle privacy settings
    if (updateUserDto.privacy) {
      if (updateUserDto.privacy.showSoldItems !== undefined) {
        user.showSoldItems = updateUserDto.privacy.showSoldItems;
      }
      if (updateUserDto.privacy.showPurchases !== undefined) {
        user.showPurchases = updateUserDto.privacy.showPurchases;
      }
      if (updateUserDto.privacy.showPhone !== undefined) {
        user.showPhone = updateUserDto.privacy.showPhone;
      }
    }

    // Handle profile picture
    if (updateUserDto.profilePicture !== undefined) {
      user.profileImageUrl = updateUserDto.profilePicture;
    }

    // Remove privacy and profilePicture from the DTO before applying other fields
    const { privacy, profilePicture, ...otherFields } = updateUserDto;
    Object.assign(user, otherFields);
    
    return this.usersRepository.save(user);
  }

  async updatePassword(id: number, newPassword: string): Promise<User> {
    const user = await this.findOne(id);
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    return this.usersRepository.save(user);
  }

  async changePassword(id: number, currentPassword: string, newPassword: string): Promise<User> {
    const user = await this.usersRepository.findOne({ 
      where: { id },
      select: ['id', 'email', 'passwordHash', 'fullName'] 
    });
    
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    
    const updatedUser = await this.usersRepository.save(user);
    
    // Return user without password hash
    const { passwordHash, ...result } = updatedUser;
    return result as User;
  }

  async remove(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
  }

  async updateProfileImage(id: number, imageUrl: string): Promise<User> {
    const user = await this.findOne(id);
    user.profileImageUrl = imageUrl;
    return this.usersRepository.save(user);
  }

  async updateProfileImageWithCloudinary(id: number, file: Express.Multer.File): Promise<User> {
    const user = await this.findOne(id);
    
    // Validate file input
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Empty file or invalid file data');
    }

    // Check file size (7MB limit for avatars)
    const maxSize = 7 * 1024 * 1024; // 7MB
    if (file.buffer.length > maxSize) {
      throw new BadRequestException(`File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
    }

    // Validate file type by checking buffer header
    const mimeType = file.mimetype;
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(`Invalid file type. Allowed types: ${allowedMimeTypes.join(', ')}`);
    }

    try {
      // Use dual storage for profile picture upload
      const uploadResult = await this.dualImageService.uploadImageToBothServices(
        file.buffer,
        id,
        'avatar',
        file.originalname
      );
      
      // Save all image URLs to user record
      user.profileImageUrl = uploadResult.recommendedUrl; // Cloudinary URL (primary)
      
      // Save DigitalOcean Spaces information for backup/fallback
      if (uploadResult.backup.success && uploadResult.backup.spacesUrl) {
        user.profileImageSpacesUrl = uploadResult.backup.spacesUrl;
        user.profileImageSpacesKey = uploadResult.backup.spacesKey;
        
        // Save variant URLs as JSON object
        if (uploadResult.backup.spacesVariants && uploadResult.backup.spacesVariants.length > 0) {
          const variants: { [key: string]: string } = {};
          uploadResult.backup.spacesVariants.forEach(variant => {
            variants[variant.variant] = variant.spacesUrl;
          });
          user.profileImageVariants = variants;
        }
      }
      
      return this.usersRepository.save(user);
    } catch (error) {
      console.error('Avatar upload error:', error);
      
      // Provide specific error messages for common issues
      if (error.message?.includes('corrupted')) {
        throw new BadRequestException('The image file appears to be corrupted. Please try a different image.');
      } else if (error.message?.includes('format')) {
        throw new BadRequestException('Unsupported image format. Please use JPG, PNG, or WebP.');
      } else if (error.message?.includes('too small')) {
        throw new BadRequestException('Image is too small. Please use an image at least 100x100 pixels.');
      } else {
        throw new BadRequestException('Failed to upload avatar. Please try again with a different image.');
      }
    }
  }

  // Follow functionality
  async followUser(followerId: number, followingId: number): Promise<{ isFollowing: boolean }> {
    if (followerId === followingId) {
      throw new ForbiddenException('You cannot follow yourself');
    }

    const follower = { id: followerId } as User;
    const following = await this.findOne(followingId);

    const existingFollow = await this.userFollowsRepository.findOne({
      where: { follower, following }
    });

    if (existingFollow) {
      await this.userFollowsRepository.remove(existingFollow);
      return { isFollowing: false };
    } else {
      const follow = this.userFollowsRepository.create({ follower, following });
      await this.userFollowsRepository.save(follow);
      return { isFollowing: true };
    }
  }

  // Block functionality
  async blockUser(blockerId: number, blockedId: number): Promise<void> {
    if (blockerId === blockedId) {
      throw new ForbiddenException('You cannot block yourself');
    }

    const blocker = { id: blockerId } as User;
    const blocked = await this.findOne(blockedId);

    const existingBlock = await this.userBlocksRepository.findOne({
      where: { blocker, blocked }
    });

    if (existingBlock) {
      throw new ForbiddenException('User is already blocked');
    }

    const block = this.userBlocksRepository.create({ blocker, blocked });
    await this.userBlocksRepository.save(block);

    // If they were following each other, remove follows
    await this.userFollowsRepository.delete({
      follower: blocker,
      following: blocked
    });
    await this.userFollowsRepository.delete({
      follower: blocked,
      following: blocker
    });
  }

  // Report functionality
  async reportUser(reporterId: number, reportedUserId: number, reason: string): Promise<void> {
    if (reporterId === reportedUserId) {
      throw new ForbiddenException('You cannot report yourself');
    }

    const reporter = { id: reporterId } as User;
    const reportedUser = await this.findOne(reportedUserId);

    // Check if user already reported this user
    const existingReport = await this.userReportsRepository.findOne({
      where: { reporter, reportedUser }
    });

    if (existingReport) {
      throw new ForbiddenException('You have already reported this user');
    }

    const report = this.userReportsRepository.create({
      reporter,
      reportedUser,
      reason,
    });

    await this.userReportsRepository.save(report);
  }

  // Get user profile with comprehensive statistics
  async getUserProfile(userId: number) {
    try {
      // Get user with privacy settings
      const user = await this.usersRepository.findOne({ 
        where: { id: userId },
        select: [
          'id',
          'fullName', 
          'email',
          'whatsappNumber',
          'role',
          'status',
          'isVerified',
          'profileImageUrl',
          'profileImageSpacesUrl',
          'profileImageSpacesKey',
          'averageRating',
          'totalRatings',
          'createdAt',
          'showSoldItems',
          'showPurchases'
        ]
      });

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Get basic counts using simple queries
      const activeListingsCount = await this.itemsRepository.count({
        where: { sellerId: userId, isActive: true, isSold: false }
      });

      const soldItemsCount = await this.itemsRepository.count({
        where: { sellerId: userId, isSold: true }
      });

      // Count saved items directly from item_favorites table
      const savedItemsResult = await this.itemsRepository.query(`
        SELECT COUNT(*) as count 
        FROM item_favorites 
        WHERE "userId" = $1
      `, [userId]);
      const savedItemsCount = parseInt(savedItemsResult[0]?.count || '0');

      // Count interests
      const interestsResult = await this.itemsRepository.query(`
        SELECT COUNT(*) as count 
        FROM interests 
        WHERE user_id = $1 AND is_active = true
      `, [userId]);
      const interestsCount = parseInt(interestsResult[0]?.count || '0');

      // Get total views
      const viewsResult = await this.itemsRepository.query(`
        SELECT COALESCE(SUM(view_count), 0) as total_views
        FROM items 
        WHERE seller_id = $1
      `, [userId]);
      const totalViews = parseInt(viewsResult[0]?.total_views || '0');

      // Calculate other stats
      const averageRating = user.averageRating || 0;
      const totalRatings = user.totalRatings || 0;
      const conversionRate = activeListingsCount > 0 ? 
        (soldItemsCount / (activeListingsCount + soldItemsCount)) * 100 : 0;
      const responseTime = 2; // Mock data

      // Filter user data
      const publicUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        whatsappNumber: undefined,
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        profileImageUrl: user.profileImageUrl,
        profileImageSpacesUrl: user.profileImageSpacesUrl,
        profileImageSpacesKey: user.profileImageSpacesKey,
        averageRating: averageRating,
        totalRatings: totalRatings,
        createdAt: user.createdAt
      };

      // Comprehensive statistics matching frontend expectations
      const comprehensiveStats = {
        // Core metrics
        activeListingsCount: activeListingsCount,
        soldItemsCount: soldItemsCount,
        purchaseHistoryCount: 0,
        savedItemsCount: savedItemsCount,
        pendingSalesCount: 0,
        viewedItemsCount: 0,
        notificationsCount: 0,
        
        // Financial metrics
        totalEarnings: 0,
        totalSpent: 0,
        
        // Performance metrics
        averageRating: averageRating,
        responseTime: responseTime,
        successfulTransactions: soldItemsCount,
        profileViews: 0,
        totalViews: totalViews,
        conversionRate: conversionRate,
        
        // Legacy fields for backward compatibility
        totalSold: soldItemsCount,
        totalBought: 0,
        totalRevenue: 0,
        joinedDate: user.createdAt,
        lastActivity: user.createdAt
      };

      return {
        user: publicUser,
        stats: comprehensiveStats,
        soldItems: [],
        boughtItems: []
      };
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      throw new InternalServerErrorException('Database operation failed');
    }
  }

  // Get user items
  async getUserItems(userId: number): Promise<Item[]> {
    const user = await this.findOne(userId);
    
    return this.itemsRepository.find({
      where: { sellerId: userId, isActive: true },
      relations: ['images', 'seller'],
      order: { createdAt: 'DESC' }
    });
  }
}
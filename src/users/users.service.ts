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
  ) {}

  async create(createUserDto: CreateUserDto & { isVerified?: boolean }): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = this.usersRepository.create({
      ...createUserDto,
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
    return this.usersRepository.findOne({ where: { email } });
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

    // Check file size (5MB limit for avatars)
    const maxSize = 5 * 1024 * 1024; // 5MB
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
      // Upload the avatar to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(file, `user-avatars/user-${id}`);
      
      // Update user with Cloudinary URL
      user.profileImageUrl = uploadResult.url;
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

  // Get user profile with statistics
  async getUserProfile(userId: number) {
    try {
      console.log(`Getting user profile for userId: ${userId}`);
      
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
          'averageRating',
          'totalRatings',
          'createdAt',
          'showSoldItems',
          'showPurchases'
        ]
      });

      console.log('User query result:', user);

      if (!user) {
        throw new NotFoundException(`User with ID ${userId} not found`);
      }

      // Get user's sold items with images using TypeORM
      const soldItems = await this.itemsRepository.find({
        where: { sellerId: userId, isActive: true },
        relations: ['images'],
        order: { createdAt: 'DESC' }
      });

      console.log('Found items:', soldItems);

      // Respect privacy settings
      const showSoldItems = user.showSoldItems !== false; // Default to true if not set
      const showPurchases = user.showPurchases !== false; // Default to true if not set
      // Phone numbers are never shown in public profiles for privacy

      // Filter user data based on privacy settings
      const publicUser = {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        whatsappNumber: undefined, // Never show phone numbers in public profiles
        role: user.role,
        status: user.status,
        isVerified: user.isVerified,
        profileImageUrl: user.profileImageUrl,
        averageRating: user.averageRating,
        totalRatings: user.totalRatings,
        createdAt: user.createdAt
      };

      return {
        user: publicUser,
        stats: {
          totalSold: showSoldItems ? soldItems.filter(item => item.isSold).length : 0,
          totalBought: 0, // TODO: Implement purchase tracking
          totalRevenue: showSoldItems ? soldItems.filter(item => item.isSold).reduce((sum, item) => sum + Number(item.price), 0) : 0,
          totalSpent: 0, // TODO: Implement purchase tracking
          joinedDate: user.createdAt,
          lastActivity: user.createdAt
        },
        soldItems: showSoldItems ? soldItems.map(item => ({
          ...item,
          category: { name: item.category }, // Map category string to category object
          viewsCount: item.viewCount  // Map viewCount to viewsCount for frontend compatibility
        })) : [],
        boughtItems: showPurchases ? [] : [] // TODO: Implement purchase tracking
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
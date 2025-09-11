import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { User, UserRole, UserStatus } from '../users/entities/user.entity';
import { Item } from '../items/entities/item.entity';
import { Category } from '../categories/entities/category.entity';
import { Message } from '../messages/entities/message.entity';
import { UserReport } from '../users/entities/user-report.entity';
import { ItemReport } from '../items/entities/item-report.entity';
import { UsersService } from '../users/users.service';
import { ItemsService } from '../items/items.service';
import * as bcrypt from 'bcryptjs';
import {
  AdminDashboardStats,
  AdminUserResponse,
  AdminItemResponse,
  AdminReportResponse,
  CreateAdminDto,
  CreateUserDto,
  UpdateUserStatusDto,
  BulkActionDto
} from './dto/admin.dto';
import { CreateItemDto as ItemsCreateItemDto } from '../items/dto/create-item.dto';
import { CreateItemDto as AdminCreateItemDto } from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Item)
    private itemRepository: Repository<Item>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    @InjectRepository(UserReport)
    private userReportRepository: Repository<UserReport>,
    @InjectRepository(ItemReport)
    private itemReportRepository: Repository<ItemReport>,
    private usersService: UsersService,
    private itemsService: ItemsService,
  ) {}

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalItems,
      totalCategories,
      totalMessages,
      totalUserReports,
      totalItemReports,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      newUsersToday,
      newItemsToday,
    ] = await Promise.all([
      this.userRepository.count(),
      this.itemRepository.count(),
      this.categoryRepository.count(),
      this.messageRepository.count(),
      this.userReportRepository.count(),
      this.itemReportRepository.count(),
      this.userRepository.count({ where: { status: UserStatus.ACTIVE } }),
      this.userRepository.count({ where: { status: UserStatus.SUSPENDED } }),
      this.userRepository.count({ where: { status: UserStatus.BANNED } }),
      this.userRepository.count({ where: { createdAt: MoreThan(today) } }),
      this.itemRepository.count({ where: { createdAt: MoreThan(today) } }),
    ]);

    const newReportsToday = await this.userReportRepository.count({
      where: { createdAt: MoreThan(today) }
    }) + await this.itemReportRepository.count({
      where: { createdAt: MoreThan(today) }
    });

    return {
      totalUsers,
      totalItems,
      totalCategories,
      totalMessages,
      totalReports: totalUserReports + totalItemReports,
      activeUsers,
      suspendedUsers,
      bannedUsers,
      recentActivity: {
        newUsersToday,
        newItemsToday,
        newReportsToday,
      },
    };
  }

  async getAnalyticsOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
      const [
        totalUsers, totalItems, activeListings, soldItems,
        newUsersLast30Days, newItemsLast30Days,
        newUsersLast7Days, newItemsLast7Days
      ] = await Promise.all([
        this.userRepository.count(),
        this.itemRepository.count(),
        this.itemRepository.count({ where: { isActive: true, isSold: false } }),
        this.itemRepository.count({ where: { isSold: true } }),
        this.userRepository.count({ where: { createdAt: MoreThan(thirtyDaysAgo) } }),
        this.itemRepository.count({ where: { createdAt: MoreThan(thirtyDaysAgo) } }),
        this.userRepository.count({ where: { createdAt: MoreThan(sevenDaysAgo) } }),
        this.itemRepository.count({ where: { createdAt: MoreThan(sevenDaysAgo) } })
      ]);

      // Calculate revenue separately with error handling
      let totalRevenue = 0;
      let avgItemPrice = 0;
      let topCategories = [];

      try {
        const revenueResult = await this.itemRepository
          .createQueryBuilder('item')
          .select('SUM(item.price)', 'sum')
          .where('item.isSold = true')
          .getRawOne();
        totalRevenue = revenueResult?.sum || 0;
      } catch (error) {
        console.error('Error calculating total revenue:', error);
      }

      try {
        const avgResult = await this.itemRepository
          .createQueryBuilder('item')
          .select('AVG(item.price)', 'avg')
          .getRawOne();
        avgItemPrice = avgResult?.avg || 0;
      } catch (error) {
        console.error('Error calculating average price:', error);
      }

      try {
        topCategories = await this.itemRepository
          .createQueryBuilder('item')
          .select(['item.category as name', 'COUNT(item.id) as count'])
          .groupBy('item.category')
          .orderBy('COUNT(item.id)', 'DESC')
          .limit(5)
          .getRawMany();
      } catch (error) {
        console.error('Error getting top categories:', error);
        topCategories = [];
      }

      const conversionRate = totalItems > 0 ? ((soldItems / totalItems) * 100).toFixed(1) : '0';
      
      return {
        overview: {
          totalUsers,
          totalItems,
          activeListings,
          soldItems,
          conversionRate: parseFloat(conversionRate),
          totalRevenue: totalRevenue || 0,
          avgItemPrice: avgItemPrice || 0
        },
        growth: {
          usersGrowth30Days: newUsersLast30Days,
          itemsGrowth30Days: newItemsLast30Days,
          usersGrowth7Days: newUsersLast7Days,
          itemsGrowth7Days: newItemsLast7Days
        },
        topCategories
      };
    } catch (error) {
      console.error('Error in getAnalyticsOverview:', error);
      throw error;
    }
  }

  async getUserGrowthAnalytics(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const userGrowth = await this.userRepository
      .createQueryBuilder('user')
      .select('DATE(user.createdAt) as date')
      .addSelect('COUNT(user.id) as count')
      .where('user.createdAt >= :startDate', { startDate })
      .groupBy('DATE(user.createdAt)')
      .orderBy('DATE(user.createdAt)', 'ASC')
      .getRawMany();

    const verifiedUsers = await this.userRepository.count({ where: { isVerified: true } });
    const unverifiedUsers = await this.userRepository.count({ where: { isVerified: false } });
    
    return {
      dailyGrowth: userGrowth,
      verification: {
        verified: verifiedUsers,
        unverified: unverifiedUsers,
        verificationRate: ((verifiedUsers / (verifiedUsers + unverifiedUsers)) * 100).toFixed(1)
      }
    };
  }

  async getRevenueAnalytics(days: number = 30) {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
    
    const dailyRevenue = await this.itemRepository
      .createQueryBuilder('item')
      .select('DATE(item.createdAt) as date')
      .addSelect('SUM(item.price) as revenue')
      .addSelect('COUNT(item.id) as transactions')
      .where('item.isSold = true')
      .andWhere('item.createdAt >= :startDate', { startDate })
      .groupBy('DATE(item.createdAt)')
      .orderBy('DATE(item.createdAt)', 'ASC')
      .getRawMany();

    const priceRanges = await this.itemRepository
      .createQueryBuilder('item')
      .select([
        'SUM(CASE WHEN item.price < 100 THEN 1 ELSE 0 END) as under100',
        'SUM(CASE WHEN item.price >= 100 AND item.price < 500 THEN 1 ELSE 0 END) as range100to500',
        'SUM(CASE WHEN item.price >= 500 AND item.price < 1000 THEN 1 ELSE 0 END) as range500to1000',
        'SUM(CASE WHEN item.price >= 1000 THEN 1 ELSE 0 END) as over1000'
      ])
      .getRawOne();

    return {
      dailyRevenue,
      priceDistribution: [
        { range: 'Under $100', count: parseInt(priceRanges.under100) || 0 },
        { range: '$100-$500', count: parseInt(priceRanges.range100to500) || 0 },
        { range: '$500-$1000', count: parseInt(priceRanges.range500to1000) || 0 },
        { range: 'Over $1000', count: parseInt(priceRanges.over1000) || 0 }
      ]
    };
  }

  async getItemPerformanceAnalytics() {
    try {
      // Top performing items - using actual column names from Item entity
      const topPerformingItems = await this.itemRepository
        .createQueryBuilder('item')
        .leftJoin('item.seller', 'seller')
        .select([
          'item.id', 
          'item.title', 
          'item.price', 
          'item.viewCount', 
          'item.category',
          'item.isSold',
          'seller.fullName as sellerName'
        ])
        .orderBy('item.viewCount', 'DESC')
        .limit(10)
        .getRawMany();

      // Items by status (using actual boolean columns)
      const itemsByStatus = await this.itemRepository
        .createQueryBuilder('item')
        .select([
          'SUM(CASE WHEN item.isSold = true THEN 1 ELSE 0 END) as sold',
          'SUM(CASE WHEN item.isSold = false AND item.isActive = true THEN 1 ELSE 0 END) as active',
          'SUM(CASE WHEN item.isActive = false THEN 1 ELSE 0 END) as inactive'
        ])
        .getRawOne();

      // Category performance - category is a string column
      const categoryPerformance = await this.itemRepository
        .createQueryBuilder('item')
        .select([
          'item.category',
          'COUNT(item.id) as totalItems',
          'COUNT(CASE WHEN item.isSold = true THEN 1 END) as soldItems',
          'AVG(item.price) as avgPrice',
          'SUM(item.viewCount) as totalViews'
        ])
        .groupBy('item.category')
        .getRawMany();

      return {
        topPerformingItems,
        statusDistribution: {
          sold: parseInt(itemsByStatus.sold) || 0,
          active: parseInt(itemsByStatus.active) || 0,
          inactive: parseInt(itemsByStatus.inactive) || 0
        },
        categoryPerformance
      };
    } catch (error) {
      console.error('Error in getItemPerformanceAnalytics:', error);
      throw new Error('Failed to get item performance analytics');
    }
  }

  async getSellerAnalytics(page: number = 1, limit: number = 10) {
    try {
      // Ensure parameters are numbers and provide defaults
      let pageNum = Number(page) || 1;
      let limitNum = Number(limit) || 10;
      
      // Validate pagination parameters
      if (pageNum < 1) pageNum = 1;
      if (limitNum < 1 || limitNum > 100) limitNum = 10;
      
      // Calculate offset for pagination
      const offset = (pageNum - 1) * limitNum;
      
      console.log('📊 Pagination params:', { page: pageNum, limit: limitNum, offset });

      // Get total count for pagination
      const totalCountQuery = await this.itemRepository
        .createQueryBuilder('item')
        .leftJoin('item.seller', 'seller')
        .select('COUNT(DISTINCT seller.id) as total')
        .where('seller.id IS NOT NULL')
        .getRawOne();

      const totalSellers = parseInt(totalCountQuery?.total || '0');

      // Get paginated sellers ordered by revenue (highest to lowest)
      const sellersData = await this.itemRepository
        .createQueryBuilder('item')
        .leftJoin('item.seller', 'seller')
        .select([
          'seller.id as sellerId',
          'seller.full_name as sellerName',
          'seller.email as sellerEmail', 
          'seller.role as sellerRole',
          'seller.created_at as joinedDate',
          'COUNT(item.id) as totalItems',
          'COUNT(CASE WHEN item.is_sold = true THEN 1 END) as soldItems',
          'COALESCE(SUM(CASE WHEN item.is_sold = true THEN item.price ELSE 0 END), 0) as totalProfit',
          'AVG(CASE WHEN item.is_sold = true THEN item.price END) as avgSalePrice',
          'COALESCE(SUM(item.view_count), 0) as totalViews'
        ])
        .where('seller.id IS NOT NULL')
        .groupBy('seller.id, seller.full_name, seller.email, seller.role, seller.created_at')
        .orderBy('totalProfit', 'DESC')
        .offset(offset)
        .limit(limitNum)
        .getRawMany();

      // Get all sellers for summary statistics (without pagination)
      const allSellersData = await this.itemRepository
        .createQueryBuilder('item')
        .leftJoin('item.seller', 'seller')
        .select([
          'seller.id as sellerId',
          'COUNT(item.id) as totalItems',
          'COUNT(CASE WHEN item.is_sold = true THEN 1 END) as soldItems',
          'COALESCE(SUM(CASE WHEN item.is_sold = true THEN item.price ELSE 0 END), 0) as totalProfit'
        ])
        .where('seller.id IS NOT NULL')
        .groupBy('seller.id')
        .getRawMany();

      // Get top performing sellers by profit (for the top sellers section)
      // Updated to include ALL sellers with items, not just those with sales
      const topSellersByProfit = await this.itemRepository
        .createQueryBuilder('item')
        .leftJoin('item.seller', 'seller')
        .select([
          'seller.id as sellerId',
          'seller.full_name as sellerName', 
          'seller.email as sellerEmail',
          'COUNT(item.id) as totalItems',
          'COUNT(CASE WHEN item.is_sold = true THEN 1 END) as soldItems',
          'COALESCE(SUM(CASE WHEN item.is_sold = true THEN item.price ELSE 0 END), 0) as totalProfit',
          'AVG(CASE WHEN item.is_sold = true THEN item.price END) as avgSalePrice',
          'COALESCE(SUM(item.view_count), 0) as totalViews'
        ])
        .where('seller.id IS NOT NULL')
        .groupBy('seller.id, seller.full_name, seller.email')
        .orderBy('totalProfit', 'DESC')
        .addOrderBy('totalItems', 'DESC') // Secondary sort by total items
        .addOrderBy('seller.full_name', 'ASC') // Tertiary sort by name for consistency
        .limit(10)
        .getRawMany();

      // Calculate summary statistics
      const totalProfit = allSellersData.reduce((sum, seller) => 
        sum + parseFloat(seller.totalprofit || '0'), 0);
      
      const totalSoldItems = allSellersData.reduce((sum, seller) => 
        sum + parseInt(seller.solditems || '0'), 0);

      const activeSellerCount = allSellersData.filter(s => parseInt(s.solditems || '0') > 0).length;
      const totalSellerCount = allSellersData.length;

      // Format paginated sellers data
      const paginatedSellers = sellersData.map(seller => ({
        id: seller.sellerid,
        fullName: seller.sellername,
        email: seller.selleremail,
        role: seller.sellerrole,
        joinedDate: seller.joineddate,
        totalItems: parseInt(seller.totalitems || '0'),
        soldItems: parseInt(seller.solditems || '0'),
        totalProfit: parseFloat(seller.totalprofit || '0'),
        avgSalePrice: parseFloat(seller.avgsaleprice || '0'),
        totalViews: parseInt(seller.totalviews || '0'),
        conversionRate: parseInt(seller.totalitems) > 0 ? 
          ((parseInt(seller.solditems) / parseInt(seller.totalitems)) * 100).toFixed(1) : '0'
      }));

      // Format top sellers data
      const formattedTopSellers = topSellersByProfit.map(seller => ({
        id: seller.sellerid,
        fullName: seller.sellername,
        email: seller.selleremail,
        totalItems: parseInt(seller.totalitems || '0'),
        soldItems: parseInt(seller.solditems || '0'),
        totalProfit: parseFloat(seller.totalprofit || '0'),
        avgSalePrice: parseFloat(seller.avgsaleprice || '0'),
        totalViews: parseInt(seller.totalviews || '0'),
        conversionRate: parseInt(seller.totalitems) > 0 ? 
          ((parseInt(seller.solditems) / parseInt(seller.totalitems)) * 100).toFixed(1) : '0'
      }));

      // Debug logging
      console.log('🔍 Raw topSellersByProfit query result:', topSellersByProfit.slice(0, 2));
      console.log('📊 Formatted top sellers:', formattedTopSellers.slice(0, 2));

      return {
        topSellersByProfit: formattedTopSellers,
        sellersSummary: {
          totalSellers: totalSellerCount,
          activeSellers: activeSellerCount,
          totalPlatformProfit: totalProfit.toFixed(2),
          totalItemsSold: totalSoldItems,
          averageProfitPerSeller: totalSellerCount > 0 ? 
            (totalProfit / totalSellerCount).toFixed(2) : '0'
        },
        allSellers: paginatedSellers,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(totalSellers / limitNum),
          totalSellers: totalSellers,
          hasNextPage: pageNum < Math.ceil(totalSellers / limitNum),
          hasPreviousPage: pageNum > 1
        }
      };
    } catch (error) {
      console.error('Error in getSellerAnalytics:', error);
      throw new Error('Failed to get seller analytics');
    }
  }

  async getAllUsers(page: number = 1, limit: number = 10, search?: string, role?: UserRole, status?: UserStatus): Promise<{ users: AdminUserResponse[]; total: number }> {
    const query = this.userRepository.createQueryBuilder('user')
      .leftJoinAndSelect('user.items', 'items')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('user.createdAt', 'DESC');

    if (search) {
      query.andWhere('(user.fullName ILIKE :search OR user.email ILIKE :search)', { search: `%${search}%` });
    }

    if (role) {
      query.andWhere('user.role = :role', { role });
    }

    if (status) {
      query.andWhere('user.status = :status', { status });
    }

    const [users, total] = await query.getManyAndCount();

    const adminUsers = users.map(user => ({
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      whatsappNumber: user.whatsappNumber,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      itemsCount: user.items?.length || 0,
      averageRating: user.averageRating,
    }));

    return { users: adminUsers, total };
  }

  async getUserById(userId: number): Promise<AdminUserResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['items'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      whatsappNumber: user.whatsappNumber,
      role: user.role,
      status: user.status,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      itemsCount: user.items?.length || 0,
      averageRating: user.averageRating,
    };
  }

  async getUserProfile(userId: number): Promise<{
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
    const user = await this.getUserById(userId);
    
    // Get items sold by user
    const soldItemsQuery = await this.itemRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.seller', 'seller')
      .where('item.seller_id = :userId', { userId })
      .orderBy('item.createdAt', 'DESC')
      .getMany();

    const soldItems: AdminItemResponse[] = soldItemsQuery.map(item => ({
      id: item.id,
      name: item.title,
      description: item.description,
      price: item.price,
      status: item.isSold ? 'sold' : (item.isActive ? 'active' : 'inactive'),
      isActive: item.isActive,
      isSold: item.isSold,
      seller: {
        id: item.seller.id,
        fullName: item.seller.fullName,
        email: item.seller.email,
      },
      category: {
        id: 1,
        name: item.category,
      },
      createdAt: item.createdAt,
      viewsCount: item.viewCount || 0,
      favoritesCount: 0,
      reportsCount: 0,
    }));

    // Get items bought by user (from purchases table if exists, or interests for now)
    let boughtItems: AdminItemResponse[] = [];
    try {
      // Try to get from item_purchases table if it exists
      const purchasesQuery = await this.itemRepository.query(`
        SELECT 
          i.*,
          seller.id as seller_id,
          seller.full_name as seller_name,
          seller.email as seller_email,
          ip.created_at as purchase_date
        FROM item_purchases ip
        JOIN items i ON ip.item_id = i.id
        JOIN users seller ON i.seller_id = seller.id
        WHERE ip.buyer_id = $1
        ORDER BY ip.created_at DESC
      `, [userId]);

      boughtItems = purchasesQuery.map((purchase: any) => ({
        id: purchase.id,
        name: purchase.title,
        description: purchase.description,
        price: purchase.price,
        status: 'sold',
        isActive: false,
        isSold: true,
        seller: {
          id: purchase.seller_id,
          fullName: purchase.seller_name,
          email: purchase.seller_email,
        },
        category: {
          id: 1,
          name: purchase.category,
        },
        createdAt: purchase.purchase_date,
        viewsCount: purchase.view_count || 0,
        favoritesCount: 0,
        reportsCount: 0,
      }));
    } catch (error) {
      console.log('item_purchases table might not exist, using interests as fallback');
      
      // Fallback: use interests table to show items user was interested in
      try {
        const interestsQuery = await this.itemRepository.query(`
          SELECT 
            i.*,
            seller.id as seller_id,
            seller.full_name as seller_name,
            seller.email as seller_email,
            interests.created_at as interest_date
          FROM interests
          JOIN items i ON interests.item_id = i.id
          JOIN users seller ON i.seller_id = seller.id
          WHERE interests.user_id = $1
          ORDER BY interests.created_at DESC
        `, [userId]);

        boughtItems = interestsQuery.map((interest: any) => ({
          id: interest.id,
          name: interest.title,
          description: interest.description,
          price: interest.price,
          status: interest.is_sold ? 'sold' : (interest.is_active ? 'active' : 'inactive'),
          isActive: interest.is_active,
          isSold: interest.is_sold,
          seller: {
            id: interest.seller_id,
            fullName: interest.seller_name,
            email: interest.seller_email,
          },
          category: {
            id: 1,
            name: interest.category,
          },
          createdAt: interest.interest_date,
          viewsCount: interest.view_count || 0,
          favoritesCount: 0,
          reportsCount: 0,
        }));
      } catch (fallbackError) {
        console.error('Could not fetch user interests either:', fallbackError);
        boughtItems = [];
      }
    }

    // Calculate stats
    const totalSold = soldItems.filter(item => item.isSold).length;
    const totalBought = boughtItems.length;
    const totalRevenue = soldItems
      .filter(item => item.isSold)
      .reduce((sum, item) => sum + parseFloat(item.price.toString()), 0);
    const totalSpent = boughtItems
      .reduce((sum, item) => sum + parseFloat(item.price.toString()), 0);

    // Get last activity (most recent item created or last login)
    const lastItemDate = soldItems[0]?.createdAt;
    const lastActivity = user.lastLogin && lastItemDate 
      ? (new Date(user.lastLogin) > new Date(lastItemDate) ? user.lastLogin : lastItemDate)
      : (user.lastLogin || lastItemDate || user.createdAt);

    return {
      user,
      soldItems,
      boughtItems,
      stats: {
        totalSold,
        totalBought,
        totalRevenue,
        totalSpent,
        joinedDate: user.createdAt,
        lastActivity: lastActivity,
      }
    };
  }

  async updateUserStatus(userId: number, updateData: UpdateUserStatusDto): Promise<AdminUserResponse> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = updateData.status as UserStatus;
    await this.userRepository.save(user);

    return this.getUserById(userId);
  }

  async createAdmin(createAdminDto: CreateAdminDto): Promise<AdminUserResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createAdminDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createAdminDto.password, 10);

    const admin = this.userRepository.create({
      fullName: createAdminDto.fullName,
      email: createAdminDto.email,
      whatsappNumber: createAdminDto.whatsappNumber,
      passwordHash: hashedPassword,
      role: createAdminDto.role as UserRole,
      status: UserStatus.ACTIVE,
      isVerified: true,
    });

    const savedAdmin = await this.userRepository.save(admin);
    return this.getUserById(savedAdmin.id);
  }

  async createUser(createUserDto: CreateUserDto): Promise<AdminUserResponse> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = this.userRepository.create({
      fullName: createUserDto.fullName,
      email: createUserDto.email,
      whatsappNumber: createUserDto.whatsappNumber,
      passwordHash: hashedPassword,
      role: UserRole.USER, // Regular users get 'user' role
      status: UserStatus.ACTIVE,
      isVerified: true, // Admin-created users are pre-verified
    });

    const savedUser = await this.userRepository.save(user);
    return this.getUserById(savedUser.id);
  }

  async createItem(createItemDto: AdminCreateItemDto, adminUserId: number): Promise<AdminItemResponse> {
    // If sellerId is provided, use it; otherwise, assign to the admin creating it
    const sellerId = createItemDto.sellerId || adminUserId;
    
    // Verify the seller exists
    const seller = await this.userRepository.findOne({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException(`Seller with ID ${sellerId} not found`);
    }

    // Use the ItemsService to create the item with proper validation
    const itemsDto: ItemsCreateItemDto = {
      title: createItemDto.title,
      description: createItemDto.description,
      price: createItemDto.price,
      category: createItemDto.category,
      condition: createItemDto.condition as any,
      quantity: createItemDto.quantity || 1,
    };
    const createdItem = await this.itemsService.create(itemsDto, sellerId);

    // Convert to AdminItemResponse format
    const item = await this.itemRepository.findOne({
      where: { id: createdItem.id },
      relations: ['seller'],
    });

    return {
      id: item.id,
      name: item.title, // Note: admin API uses 'name' but Item entity uses 'title'
      description: item.description,
      price: parseFloat(item.price.toString()),
      status: item.isSold ? 'sold' : 'active',
      isActive: item.isActive,
      isSold: item.isSold,
      seller: {
        id: item.seller.id,
        fullName: item.seller.fullName,
        email: item.seller.email,
      },
      category: {
        id: 1, // Fallback category ID since we don't have category entities yet
        name: item.category || createItemDto.category,
      },
      createdAt: item.createdAt,
      viewsCount: item.viewCount,
      favoritesCount: 0, // This would need to be calculated from favorites table
      reportsCount: 0, // This would need to be calculated from reports table
    };
  }

  async deleteUser(userId: number): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      throw new BadRequestException('Cannot delete super admin');
    }

    await this.userRepository.remove(user);
  }

  async getAllItems(page: number = 1, limit: number = 10, search?: string): Promise<{ items: AdminItemResponse[]; total: number }> {
    const query = this.itemRepository.createQueryBuilder('item')
      .leftJoinAndSelect('item.seller', 'seller')
      .leftJoinAndSelect('item.images', 'images')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('item.createdAt', 'DESC');

    if (search) {
      query.andWhere('(item.title ILIKE :search OR item.description ILIKE :search)', { search: `%${search}%` });
    }

    const [items, total] = await query.getManyAndCount();

    const adminItems = items.map(item => ({
      id: item.id,
      name: item.title,
      description: item.description,
      price: item.price,
      status: item.isSold ? 'sold' : (item.isActive ? 'active' : 'inactive'),
      isActive: item.isActive,
      isSold: item.isSold,
      seller: {
        id: item.seller.id,
        fullName: item.seller.fullName,
        email: item.seller.email,
      },
      category: {
        id: 1, // Default category ID since it's a string field
        name: item.category,
      },
      createdAt: item.createdAt,
      viewsCount: item.viewCount || 0,
      favoritesCount: 0, // TODO: Add favorites relation
      reportsCount: 0, // TODO: Add item reports relation
    }));

    return { items: adminItems, total };
  }

  async deleteItem(itemId: number): Promise<void> {
    const item = await this.itemRepository.findOne({ where: { id: itemId } });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    await this.itemRepository.remove(item);
  }

  async getAllReports(page: number = 1, limit: number = 10): Promise<{ reports: AdminReportResponse[]; total: number }> {
    try {
      console.log('getAllReports called with page:', page, 'limit:', limit);
      
      // Get user reports with error handling
      let userReports = [];
      let itemReports = [];

      try {
        // Use raw query for user reports as well
        const userReportsRaw = await this.userReportRepository.query(`
          SELECT 
            ur.*,
            reporter.id as reporter_id,
            reporter.full_name as reporter_name,
            reporter.email as reporter_email,
            reported.id as reported_user_id,
            reported.full_name as reported_user_name,
            reported.email as reported_user_email
          FROM user_reports ur
          LEFT JOIN users reporter ON ur."reporterId" = reporter.id
          LEFT JOIN users reported ON ur."reportedUserId" = reported.id
          ORDER BY ur."createdAt" DESC
          LIMIT $1 OFFSET $2
        `, [Math.ceil(limit / 2), (page - 1) * Math.ceil(limit / 2)]);

        console.log('Raw user reports query returned:', userReportsRaw.length, 'records');

        // Convert raw results to proper format
        userReports = userReportsRaw.map(raw => ({
          id: raw.id,
          reason: raw.reason,
          status: raw.status,
          adminNotes: raw.adminNotes,
          createdAt: raw.createdAt,
          reporter: {
            id: raw.reporter_id,
            fullName: raw.reporter_name,
            email: raw.reporter_email
          },
          reportedUser: {
            id: raw.reported_user_id,
            fullName: raw.reported_user_name,
            email: raw.reported_user_email
          }
        }));

      } catch (error) {
        console.error('Error fetching user reports with raw query:', error);
        userReports = [];
      }

      try {
        // Use raw query to get item reports with joins since relations might not work
        const itemReportsRaw = await this.itemReportRepository.query(`
          SELECT 
            ir.*,
            u.id as reporter_id,
            u.full_name as reporter_name, 
            u.email as reporter_email,
            i.id as item_id,
            i.title as item_title,
            seller.id as seller_id,
            seller.full_name as seller_name,
            seller.email as seller_email
          FROM item_reports ir
          LEFT JOIN users u ON ir."reporterId" = u.id
          LEFT JOIN items i ON ir."itemId" = i.id
          LEFT JOIN users seller ON i.seller_id = seller.id
          ORDER BY ir."createdAt" DESC
          LIMIT $1 OFFSET $2
        `, [Math.floor(limit / 2), (page - 1) * Math.floor(limit / 2)]);

        console.log('Raw item reports query returned:', itemReportsRaw.length, 'records');

        // Convert raw results to proper format
        itemReports = itemReportsRaw.map(raw => ({
          id: raw.id,
          reason: raw.reason,
          description: raw.description,
          status: raw.status,
          adminNotes: raw.adminNotes,
          createdAt: raw.createdAt,
          reporter: {
            id: raw.reporter_id,
            fullName: raw.reporter_name,
            email: raw.reporter_email
          },
          item: {
            id: raw.item_id,
            title: raw.item_title
          },
          seller: {
            id: raw.seller_id,
            fullName: raw.seller_name,
            email: raw.seller_email
          }
        }));

      } catch (error) {
        console.error('Error fetching item reports with raw query:', error);
        itemReports = [];
      }

      const userReportsFormatted: AdminReportResponse[] = userReports.map(report => ({
        id: report.id,
        type: 'user' as const,
        reason: report.reason,
        status: report.status,
        reportedBy: {
          id: report.reporter.id,
          fullName: report.reporter.fullName,
          email: report.reporter.email,
        },
        targetUser: {
          id: report.reportedUser.id,
          fullName: report.reportedUser.fullName,
          email: report.reportedUser.email,
        },
        adminNotes: report.adminNotes,
        createdAt: report.createdAt,
      }));

      const itemReportsFormatted: AdminReportResponse[] = itemReports.map(report => {
        try {
          return {
            id: report.id,
            type: 'item' as const,
            reason: report.reason,
            description: report.description,
            status: report.status,
            reportedBy: {
              id: report.reporter?.id || 0,
              fullName: report.reporter?.fullName || 'Unknown User',
              email: report.reporter?.email || 'unknown@example.com',
            },
            targetItem: {
              id: report.item?.id || 0,
              name: report.item?.title || 'Unknown Item',
            },
            seller: {
              id: report.seller?.id || 0,
              fullName: report.seller?.fullName || 'Unknown Seller',
              email: report.seller?.email || 'unknown@example.com',
            },
            adminNotes: report.adminNotes || '',
            createdAt: report.createdAt,
          };
        } catch (formatError) {
          console.error('Error formatting item report:', report.id, formatError);
          return {
            id: report.id,
            type: 'item' as const,
            reason: report.reason || 'Unknown reason',
            status: report.status || 'pending',
            reportedBy: {
              id: 0,
              fullName: 'Error loading user',
              email: 'error@example.com',
            },
            targetItem: {
              id: 0,
              name: 'Error loading item',
            },
            seller: {
              id: 0,
              fullName: 'Error loading seller',
              email: 'error@example.com',
            },
            adminNotes: report.adminNotes || '',
            createdAt: report.createdAt || new Date(),
          };
        }
      }).filter(report => report !== null);

      const allReports = [...userReportsFormatted, ...itemReportsFormatted]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      console.log('Final reports count:', allReports.length, 'User reports:', userReportsFormatted.length, 'Item reports:', itemReportsFormatted.length);

      let total = 0;
      try {
        total = await this.userReportRepository.count() + await this.itemReportRepository.count();
      } catch (error) {
        console.error('Error counting reports:', error);
        total = allReports.length;
      }

      return { reports: allReports, total };
    } catch (error) {
      console.error('Error in getAllReports:', error);
      return { reports: [], total: 0 };
    }
  }

  async bulkUserAction(bulkActionDto: BulkActionDto): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const userId of bulkActionDto.userIds) {
      try {
        switch (bulkActionDto.action) {
          case 'suspend':
            await this.updateUserStatus(userId, { status: 'suspended', reason: bulkActionDto.reason });
            break;
          case 'activate':
            await this.updateUserStatus(userId, { status: 'active', reason: bulkActionDto.reason });
            break;
          case 'ban':
            await this.updateUserStatus(userId, { status: 'banned', reason: bulkActionDto.reason });
            break;
          case 'delete':
            await this.deleteUser(userId);
            break;
        }
        success++;
      } catch (error) {
        failed++;
      }
    }

    return { success, failed };
  }

  async updateReportStatus(reportId: string, status: string, adminNotes?: string): Promise<void> {
    // Try to find and update user report first
    const userReport = await this.userReportRepository.findOne({ where: { id: reportId } });
    if (userReport) {
      userReport.status = status as any;
      if (adminNotes) {
        userReport.adminNotes = adminNotes;
      }
      await this.userReportRepository.save(userReport);
      return;
    }

    // Try to find and update item report
    const itemReport = await this.itemReportRepository.findOne({ where: { id: reportId } });
    if (itemReport) {
      itemReport.status = status as any;
      if (adminNotes) {
        itemReport.adminNotes = adminNotes;
      }
      await this.itemReportRepository.save(itemReport);
      return;
    }

    throw new NotFoundException('Report not found');
  }

  // Category Management Methods
  async getAllCategories() {
    const categories = await this.categoryRepository.find({
      order: { name: 'ASC' }
    });

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const itemsCount = await this.itemRepository.count({ 
          where: { category: category.name } 
        });
        
        return {
          id: category.id,
          name: category.name,
          icon: category.icon || '📦',
          description: category.description || '',
          isActive: category.isActive,
          itemsCount,
          createdAt: category.createdAt
        };
      })
    );

    return categoriesWithCounts;
  }

  async createCategory(createCategoryDto: { name: string; icon?: string; description?: string }) {
    // Check if category with same name already exists
    const existingCategory = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name }
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = this.categoryRepository.create({
      name: createCategoryDto.name,
      icon: createCategoryDto.icon || '📦',
      description: createCategoryDto.description || '',
      isActive: true
    });

    const savedCategory = await this.categoryRepository.save(category);

    return {
      id: savedCategory.id,
      name: savedCategory.name,
      icon: savedCategory.icon,
      description: savedCategory.description,
      isActive: savedCategory.isActive,
      itemsCount: 0,
      createdAt: savedCategory.createdAt
    };
  }

  async updateCategory(id: string, updateCategoryDto: { name?: string; icon?: string; description?: string; isActive?: boolean }) {
    const category = await this.categoryRepository.findOne({ where: { id } });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      // Check if another category with this name exists
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name }
      });

      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    // Update fields
    if (updateCategoryDto.name !== undefined) category.name = updateCategoryDto.name;
    if (updateCategoryDto.icon !== undefined) category.icon = updateCategoryDto.icon;
    if (updateCategoryDto.description !== undefined) category.description = updateCategoryDto.description;
    if (updateCategoryDto.isActive !== undefined) category.isActive = updateCategoryDto.isActive;

    const savedCategory = await this.categoryRepository.save(category);

    // Get items count
    const itemsCount = await this.itemRepository.count({ 
      where: { category: category.name } 
    });

    return {
      id: savedCategory.id,
      name: savedCategory.name,
      icon: savedCategory.icon,
      description: savedCategory.description,
      isActive: savedCategory.isActive,
      itemsCount,
      createdAt: savedCategory.createdAt
    };
  }

  async deleteCategory(id: string) {
    const category = await this.categoryRepository.findOne({
      where: { id },
      relations: ['items']
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check if category has items
    const itemsCount = await this.itemRepository.count({ 
      where: { category: category.name } 
    });
    if (itemsCount > 0) {
      throw new BadRequestException(`Cannot delete category with ${itemsCount} items. Move items to another category first.`);
    }

    await this.categoryRepository.remove(category);

    return { success: true, message: 'Category deleted successfully' };
  }

  async uploadItemImages(itemId: number, files: Express.Multer.File[], adminUserId: number) {
    // Verify admin has permission and item exists
    const item = await this.itemRepository.findOne({
      where: { id: itemId },
      relations: ['seller']
    });

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // Use the admin-specific upload method that bypasses ownership checks
    return this.itemsService.uploadImagesAsAdmin(itemId, files);
  }
}

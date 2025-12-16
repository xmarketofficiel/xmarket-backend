import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { User } from './../users/entities/user.entity';
import { Service } from './entities/service.entity';
import { Rating } from './entities/rating.entity';
import { RatingCalculationService } from './rating-calculation.service';
import { ServiceCategoriesService } from './service-categories.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { PaginatedResponse, PaginationMeta } from './dto/pagination-response.dto';

@Injectable()
export class ServicesService {

  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
    private ratingCalculationService: RatingCalculationService,
    private serviceCategoriesService: ServiceCategoriesService,
  ) {}

  async create(createServiceDto: CreateServiceDto, userId: string) {
    // Auto-create category reference in DB if it doesn't exist
    // This ensures categories are always synced from config without needing migrations
    const category = await this.serviceCategoriesService.ensureCategoryExists(
      createServiceDto.serviceCategoryId
    );

    const service = this.serviceRepository.create({
      title: createServiceDto.title,
      description: createServiceDto.description,
      priceFrom: createServiceDto.price,
      serviceCategoryId: category.id,
      type: createServiceDto.type,
      departureTime: createServiceDto.departureTime ? new Date(createServiceDto.departureTime) : null,
      location: createServiceDto.location,
      userId,
    });

    const savedService = await this.serviceRepository.save(service);

    return savedService;
  }

  async findAll(searchDto: SearchServicesDto): Promise<PaginatedResponse<any>> {
    const { category, search, location } = searchDto;
    const page = searchDto.page || 1;
    const limit = searchDto.limit || 10;
    const sortBy = searchDto.sortBy || 'createdAt';
    const sortOrder = searchDto.sortOrder || 'DESC';
    const offset = (page - 1) * limit;

    const queryBuilder = this.serviceRepository
      .createQueryBuilder('service')
      .leftJoinAndSelect('service.user', 'user')
      .where('service.isActive = :isActive', { isActive: true })
      // Exclude expired time-based services (departure_time has passed)
      .andWhere(
        '(service.type != :timeBased OR service.departureTime IS NULL OR service.departureTime > :now)',
        { timeBased: 'time-based', now: new Date() }
      );

    // Apply filters
    if (category) {
      queryBuilder.andWhere('service.serviceCategoryId = :category', { category });
    }

    if (search) {
      queryBuilder.andWhere(
        '(service.title ILIKE :search OR service.description ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    if (location) {
      queryBuilder.andWhere('service.location ILIKE :location', { 
        location: `%${location}%` 
      });
    }

    // Get total count for pagination
    const total = await queryBuilder.getCount();

    // Apply urgency-based sorting: time-based services with soonest departure first, then newest
    // We use CASE to create a priority score in SQL
    const services = await queryBuilder
      .addSelect(`
        CASE 
          WHEN service.type = 'time-based' AND service.departureTime IS NOT NULL 
          THEN 1 
          ELSE 2 
        END
      `, 'type_priority')
      .addSelect(`
        CASE 
          WHEN service.type = 'time-based' AND service.departureTime IS NOT NULL 
          THEN EXTRACT(EPOCH FROM service.departureTime)
          ELSE 0
        END
      `, 'departure_epoch')
      .orderBy('type_priority', 'ASC')
      .addOrderBy('departure_epoch', 'ASC')
      .addOrderBy('service.createdAt', 'DESC')
      .skip(offset)
      .take(limit)
      .getMany();

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };

    return { data: services, meta };
  }

  async findOne(id: string) {
    const service = await this.serviceRepository.findOne({
      where: { id, isActive: true },
      relations: ['user'],
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto, userId: string) {
    const service = await this.findOne(id);

    if (service.userId !== userId) {
      throw new ForbiddenException('You can only update your own services');
    }

    await this.serviceRepository.update(id, updateServiceDto);
    const updatedService = await this.findOne(id);

    return updatedService;
  }

  async remove(id: string, userId: string): Promise<void> {
    const service = await this.findOne(id);

    if (service.userId !== userId) {
      throw new ForbiddenException('You can only delete your own services');
    }

    await this.serviceRepository.update(id, { isActive: false });
  }

  async addRating(serviceId: string, createRatingDto: CreateRatingDto, userId: string) {
    const service = await this.findOne(serviceId);

    // Users cannot rate their own services
    if (service.userId === userId) {
      throw new ForbiddenException('You cannot rate your own service');
    }

    // Check if user already rated this service
    const existingRating = await this.ratingRepository.findOne({
      where: {
        serviceId,
        ratingUserId: userId,
        isActive: true,
      },
    });

    let rating;

    if (existingRating) {
      // Update existing rating
      await this.ratingRepository.update(existingRating.id, {
        rating: createRatingDto.rating,
        comment: createRatingDto.comment,
      });

      rating = await this.ratingRepository.findOne({
        where: { id: existingRating.id },
        relations: ['ratingUser'],
      });
    } else {
      // Create new rating
      const newRating = this.ratingRepository.create({
        ...createRatingDto,
        serviceId,
        ratedUserId: service.userId,
        ratingUserId: userId,
      });

      const savedRating = await this.ratingRepository.save(newRating);
      
      rating = await this.ratingRepository.findOne({
        where: { id: savedRating.id },
        relations: ['ratingUser'],
      });
    }

    // Update calculated ratings
    await this.ratingCalculationService.updateServiceRating(serviceId);
    await this.ratingCalculationService.updateUserRating(service.userId);

    return rating;
  }

  async getServiceRatings(serviceId: string, page = 1, limit = 10): Promise<PaginatedResponse<any>> {
    await this.findOne(serviceId); // Verify service exists

    const offset = (page - 1) * limit;

    // Get total count
    const total = await this.ratingRepository.count({
      where: {
        serviceId,
        isActive: true,
      },
    });

    // Get ratings with user info
    const ratings = await this.ratingRepository.find({
      where: {
        serviceId,
        isActive: true,
      },
      relations: ['ratingUser'],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage,
      hasPrevPage,
    };

    return { data: ratings, meta };
  }

  async getUserServices(userId: string) {
    const services = await this.serviceRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });

    return services;
  }

  /**
   * Deactivate all expired time-based services
   * Can be called manually or via a scheduled task
   */
  async deactivateExpiredServices(): Promise<{ deactivatedCount: number }> {
    const result = await this.serviceRepository
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('type = :type', { type: 'time-based' })
      .andWhere('departureTime IS NOT NULL')
      .andWhere('departureTime < :now', { now: new Date() })
      .andWhere('isActive = :isActive', { isActive: true })
      .execute();

    const deactivatedCount = result.affected || 0;
    
    if (deactivatedCount > 0) {
      console.log(`[Services] Deactivated ${deactivatedCount} expired time-based services`);
    }

    return { deactivatedCount };
  }
}
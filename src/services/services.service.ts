import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike, LessThan, MoreThan } from 'typeorm';
import { User } from './../users/entities/user.entity';
import { Service } from './entities/service.entity';
import { Rating } from './entities/rating.entity';
import { ContactEvent, ContactStatus } from './entities/contact-event.entity';
import { RatingCalculationService } from './rating-calculation.service';
import { ServiceCategoriesService } from './service-categories.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { SearchServicesDto } from './dto/search-services.dto';
import { CreateRatingDto } from './dto/create-rating.dto';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactStatusDto } from './dto/update-contact-status.dto';
import { PaginatedResponse, PaginationMeta } from './dto/pagination-response.dto';
import { NotificationQueueService } from '../notifications/services/notification-queue.service';

@Injectable()
export class ServicesService {

  constructor(
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
    @InjectRepository(ContactEvent)
    private contactEventRepository: Repository<ContactEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private ratingCalculationService: RatingCalculationService,
    private serviceCategoriesService: ServiceCategoriesService,
    @Inject(forwardRef(() => NotificationQueueService))
    private notificationQueueService: NotificationQueueService,
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
      fromLocation: createServiceDto.fromLocation,
      toLocation: createServiceDto.toLocation,
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
      // Exclude expired time-based services (30 minutes after departure_time)
      .andWhere(
        '(service.type != :timeBased OR service.departureTime IS NULL OR service.departureTime + INTERVAL \'30 minutes\' > :now)',
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
   * Services are deactivated 30 minutes after their departure time
   * Can be called manually or via a scheduled task
   */
  async deactivateExpiredServices(): Promise<{ deactivatedCount: number }> {
    const result = await this.serviceRepository
      .createQueryBuilder()
      .update()
      .set({ isActive: false })
      .where('type = :type', { type: 'time-based' })
      .andWhere('departureTime IS NOT NULL')
      .andWhere('departureTime + INTERVAL \'30 minutes\' < :now', { now: new Date() })
      .andWhere('isActive = :isActive', { isActive: true })
      .execute();

    const deactivatedCount = result.affected || 0;
    
    if (deactivatedCount > 0) {
      console.log(`[Services] Deactivated ${deactivatedCount} expired time-based services (30min grace period)`);
    }

    return { deactivatedCount };
  }

  // ============= CONTACT TRACKING METHODS =============

  /**
   * Log a contact event when a customer clicks to contact a seller
   * Returns the seller's WhatsApp number for redirect
   */
  async logContactEvent(createContactDto: CreateContactDto, customerId: number) {
    const service = await this.findOne(createContactDto.serviceId);
    
    // Get seller info with WhatsApp number
    const seller = await this.userRepository.findOne({
      where: { id: parseInt(service.userId) },
      select: ['id', 'whatsappNumber', 'fullName', 'firstName', 'lastName'],
    });

    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    if (!seller.whatsappNumber) {
      throw new NotFoundException('Seller WhatsApp number not available');
    }

    // Check if contact already exists
    const existingContact = await this.contactEventRepository.findOne({
      where: {
        customerId,
        serviceId: createContactDto.serviceId,
        isActive: true,
      },
    });

    let contactEvent;

    if (existingContact) {
      // Update existing contact (user contacted again)
      contactEvent = existingContact;
    } else {
      // Create new contact event
      const newContact = this.contactEventRepository.create({
        customerId,
        sellerId: seller.id,
        serviceId: createContactDto.serviceId,
        platform: createContactDto.platform || 'whatsapp',
        status: ContactStatus.CONTACTED,
      });

      contactEvent = await this.contactEventRepository.save(newContact);

      // Schedule follow-up notification (60 hours from now)
      try {
        await this.notificationQueueService.scheduleFollowUp(
          contactEvent.id,
          contactEvent.customerId,
          contactEvent.serviceId,
          contactEvent.sellerId,
        );
      } catch (error) {
        // Log error but don't fail the contact logging
        console.error('Failed to schedule follow-up notification:', error);
      }
    }

    return {
      contactEvent,
      whatsappNumber: seller.whatsappNumber,
      sellerName: seller.fullName || `${seller.firstName} ${seller.lastName}`.trim(),
    };
  }

  /**
   * Update contact status (e.g., when customer provides feedback)
   */
  async updateContactStatus(
    contactId: string,
    updateDto: UpdateContactStatusDto,
    userId: number,
  ) {
    const contact = await this.contactEventRepository.findOne({
      where: { id: contactId, customerId: userId, isActive: true },
    });

    if (!contact) {
      throw new NotFoundException('Contact event not found');
    }

    const updateData: any = {
      status: updateDto.status,
    };

    if (updateDto.customerFeedback) {
      updateData.customerFeedback = updateDto.customerFeedback;
    }

    if (updateDto.status === ContactStatus.COMPLETED) {
      updateData.completedAt = new Date();
    }

    if (updateDto.status === ContactStatus.RATED) {
      updateData.completedAt = updateData.completedAt || new Date();
    }

    await this.contactEventRepository.update(contactId, updateData);

    return await this.contactEventRepository.findOne({
      where: { id: contactId },
      relations: ['service', 'seller'],
    });
  }

  /**
   * Get contacts that need follow-up (48-72 hours after contact)
   * Used by automated system to send rating requests
   */
  async getContactsNeedingFollowUp(): Promise<ContactEvent[]> {
    const now = new Date();
    const followUpStart = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago
    const followUpEnd = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48 hours ago

    const contacts = await this.contactEventRepository.find({
      where: {
        status: ContactStatus.CONTACTED,
        isActive: true,
        contactedAt: LessThan(followUpEnd),
        followUpSentAt: null,
      },
      relations: ['customer', 'seller', 'service'],
    });

    return contacts;
  }

  /**
   * Mark follow-up as sent
   */
  async markFollowUpSent(contactId: string): Promise<void> {
    await this.contactEventRepository.update(contactId, {
      followUpSentAt: new Date(),
      status: ContactStatus.FOLLOW_UP_SENT,
    });
  }

  /**
   * Get user's contact history
   */
  async getUserContactHistory(userId: number, page = 1, limit = 10): Promise<PaginatedResponse<any>> {
    const offset = (page - 1) * limit;

    const total = await this.contactEventRepository.count({
      where: {
        customerId: userId,
        isActive: true,
      },
    });

    const contacts = await this.contactEventRepository.find({
      where: {
        customerId: userId,
        isActive: true,
      },
      relations: ['service', 'seller'],
      order: { contactedAt: 'DESC' },
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

    return { data: contacts, meta };
  }
}
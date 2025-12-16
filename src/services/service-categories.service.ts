import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { Service } from './entities/service.entity';
import { SERVICE_CATEGORIES, getCategorySlug, getCategoryBySlug } from './config/service-categories.config';

@Injectable()
export class ServiceCategoriesService {
  constructor(
    @InjectRepository(ServiceCategory)
    private serviceCategoryRepository: Repository<ServiceCategory>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
  ) {}

  /**
   * Calculate urgency score for a service
   * Higher score = more urgent (should appear first)
   * Time-based services with sooner departure get higher scores
   * Ongoing services get scored by recency
   */
  private getServiceUrgencyScore(service: Service): number {
    const now = new Date();
    
    // Time-based services with departure time
    if (service.type === 'time-based' && service.departureTime) {
      const departureTime = new Date(service.departureTime);
      const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Expired services get lowest priority
      if (hoursUntilDeparture < 0) return -1000;
      
      // More urgent = higher score (inverse of hours left, scaled)
      // Services departing soon get very high scores
      if (hoursUntilDeparture < 2) return 10000;
      if (hoursUntilDeparture < 6) return 5000;
      if (hoursUntilDeparture < 12) return 2000;
      if (hoursUntilDeparture < 24) return 1000;
      if (hoursUntilDeparture < 48) return 500;
      return 100; // Future time-based still gets priority over ongoing
    }
    
    // Ongoing services: score by recency (newer = higher score, but less than time-based)
    const createdAt = new Date(service.createdAt);
    const hoursAgo = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // Newer ongoing services get higher scores (max 50, decaying over time)
    return Math.max(0, 50 - hoursAgo);
  }

  async findAll(includeInactive = false): Promise<ServiceCategory[]> {
    // Get all categories from DB with their services loaded via relation
    const dbCategories = await this.serviceCategoryRepository.find({
      relations: ['services'],
    });
    
    console.log('[ServiceCategories] DB Categories with services:', dbCategories.map(c => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      servicesCount: c.services?.length || 0,
      services: c.services?.map(s => ({
        title: s.title,
        type: s.type,
        departureTime: s.departureTime,
        isActive: s.isActive,
      })),
    })));

    // Build categories with dynamic ordering based on urgency
    const categories = SERVICE_CATEGORIES.map((config) => {
      const slug = getCategorySlug(config.name);
      const dbCategory = dbCategories.find(db => db.slug === slug);
      const isActive = dbCategory?.isActive ?? true;
      
      // Filter by isActive if requested
      if (!includeInactive && !isActive) {
        return null;
      }
      
      // Get active services for this category from the relation
      // Also filter out expired time-based services
      const now = new Date();
      const categoryServices = dbCategory?.services?.filter(s => {
        if (!s.isActive) return false;
        // Exclude expired time-based services
        if (s.type === 'time-based' && s.departureTime) {
          return new Date(s.departureTime) > now;
        }
        return true;
      }) || [];
      
      // Find the hottest service
      let hottestService: Service | null = null;
      let urgencyScore = -Infinity;
      
      if (categoryServices.length > 0) {
        // Sort by urgency and get the hottest
        const sorted = [...categoryServices].sort((a, b) => 
          this.getServiceUrgencyScore(b) - this.getServiceUrgencyScore(a)
        );
        hottestService = sorted[0];
        urgencyScore = this.getServiceUrgencyScore(hottestService);
      }
      
      console.log(`[ServiceCategories] Category "${config.name}":`, {
        dbId: dbCategory?.id,
        servicesCount: categoryServices.length,
        hottestService: hottestService ? {
          title: hottestService.title,
          type: hottestService.type,
          departureTime: hottestService.departureTime,
        } : null,
        urgencyScore,
      });
      
      // Get hottest item's departure time for display on category card
      const hottestDepartureTime = hottestService?.type === 'time-based' && hottestService?.departureTime
        ? hottestService.departureTime
        : null;
      
      return {
        id: dbCategory?.id || slug,
        name: config.name,
        slug: slug,
        description: config.name,
        icon: config.icon,
        backgroundImage: config.backgroundImage,
        type: config.type,
        displayOrder: config.displayOrder, // Keep for reference but not used for sorting
        dynamicOrder: urgencyScore, // Used for dynamic sorting
        hottestDepartureTime: hottestDepartureTime, // For displaying timing on category card
        isActive: isActive,
        createdAt: dbCategory?.createdAt || new Date(),
        updatedAt: dbCategory?.updatedAt || new Date(),
      } as ServiceCategory & { dynamicOrder: number; hottestDepartureTime: Date | null };
    }).filter(cat => cat !== null);
    
    // Sort by dynamic urgency score (highest first)
    categories.sort((a, b) => b.dynamicOrder - a.dynamicOrder);
    
    console.log('[ServiceCategories] Final order:', categories.map(c => ({
      name: c.name,
      dynamicOrder: c.dynamicOrder,
    })));
    
    // Remove the temporary dynamicOrder field but keep hottestDepartureTime
    return categories.map(({ dynamicOrder, ...cat }) => cat);
  }

  async findOne(id: string): Promise<ServiceCategory> {
    // Try to find in database first
    const dbCategory = await this.serviceCategoryRepository.findOne({
      where: { id },
    });

    // Find matching config by ID or slug
    let config = SERVICE_CATEGORIES.find(c => getCategorySlug(c.name) === id);
    if (!config && dbCategory) {
      config = SERVICE_CATEGORIES.find(c => getCategorySlug(c.name) === dbCategory.slug);
    }
    
    if (!config) {
      throw new NotFoundException(`Service category with ID ${id} not found in configuration`);
    }

    const slug = getCategorySlug(config.name);
    
    return {
      id: dbCategory?.id || slug,
      name: config.name,
      slug: slug,
      description: config.name,
      icon: config.icon,
      backgroundImage: config.backgroundImage,
      type: config.type,
      displayOrder: config.displayOrder,
      isActive: dbCategory?.isActive ?? true,
      createdAt: dbCategory?.createdAt || new Date(),
      updatedAt: dbCategory?.updatedAt || new Date(),
    } as ServiceCategory;
  }

  async findBySlug(slug: string): Promise<ServiceCategory> {
    const config = getCategoryBySlug(slug);
    
    if (!config) {
      throw new NotFoundException(`Service category with slug ${slug} not found in configuration`);
    }

    const dbCategory = await this.serviceCategoryRepository.findOne({
      where: { slug, isActive: true },
    });

    return {
      id: dbCategory?.id || slug,
      name: config.name,
      slug: slug,
      description: config.name,
      icon: config.icon,
      backgroundImage: config.backgroundImage,
      type: config.type,
      displayOrder: config.displayOrder,
      isActive: dbCategory?.isActive ?? true,
      createdAt: dbCategory?.createdAt || new Date(),
      updatedAt: dbCategory?.updatedAt || new Date(),
    } as ServiceCategory;
  }

  async create(createDto: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const category = this.serviceCategoryRepository.create(createDto);
    return this.serviceCategoryRepository.save(category);
  }

  async ensureCategoryExists(slug: string): Promise<ServiceCategory> {
    // Check if category exists in config
    const config = getCategoryBySlug(slug);
    if (!config) {
      throw new NotFoundException(`Category ${slug} not found in configuration`);
    }

    // Check if already in database
    let dbCategory = await this.serviceCategoryRepository.findOne({
      where: { slug },
    });

    // If not in DB, create entry with required fields from config
    if (!dbCategory) {
      dbCategory = await this.serviceCategoryRepository.save({
        name: config.name,
        slug,
        description: config.name,
        icon: config.icon,
        backgroundImage: config.backgroundImage,
        type: config.type,
        displayOrder: config.displayOrder,
        isActive: true,
      });
    }

    // Return merged data - everything from config except id, isActive, timestamps from DB
    return {
      id: dbCategory.id,
      name: config.name,
      slug: slug,
      description: config.name,
      icon: config.icon,
      backgroundImage: config.backgroundImage,
      type: config.type,
      displayOrder: config.displayOrder,
      isActive: dbCategory.isActive,
      createdAt: dbCategory.createdAt,
      updatedAt: dbCategory.updatedAt,
    } as ServiceCategory;
  }

  async update(id: string, updateDto: Partial<ServiceCategory>): Promise<ServiceCategory> {
    const category = await this.findOne(id);
    Object.assign(category, updateDto);
    return this.serviceCategoryRepository.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    await this.serviceCategoryRepository.remove(category);
  }

  async updateDisplayOrder(categoryIds: string[]): Promise<void> {
    const promises = categoryIds.map((id, index) =>
      this.serviceCategoryRepository.update(id, { displayOrder: index }),
    );
    await Promise.all(promises);
  }
}

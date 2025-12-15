import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceCategory } from './entities/service-category.entity';
import { SERVICE_CATEGORIES, getCategorySlug, getCategoryBySlug } from './config/service-categories.config';

@Injectable()
export class ServiceCategoriesService {
  constructor(
    @InjectRepository(ServiceCategory)
    private serviceCategoryRepository: Repository<ServiceCategory>,
  ) {}

  async findAll(includeInactive = false): Promise<ServiceCategory[]> {
    // Get all category metadata from database (if exists)
    const dbCategories = await this.serviceCategoryRepository.find();

    // Always return from config, merge with DB metadata if exists
    const categories = SERVICE_CATEGORIES.map((config) => {
      const slug = getCategorySlug(config.name);
      const dbCategory = dbCategories.find(db => db.slug === slug);
      const isActive = dbCategory?.isActive ?? true;
      
      // Filter by isActive if requested
      if (!includeInactive && !isActive) {
        return null;
      }
      
      return {
        id: dbCategory?.id || slug,
        name: config.name,
        slug: slug,
        description: config.name,
        icon: config.icon,
        backgroundImage: config.backgroundImage,
        type: config.type,
        displayOrder: config.displayOrder,
        isActive: isActive,
        createdAt: dbCategory?.createdAt || new Date(),
        updatedAt: dbCategory?.updatedAt || new Date(),
      } as ServiceCategory;
    }).filter(cat => cat !== null)
      .sort((a, b) => a.displayOrder - b.displayOrder);

    return categories;
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

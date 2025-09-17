import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { ItemsService } from '../items/items.service';
import { SearchItemsDto } from '../items/dto/search-items.dto';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    private itemsService: ItemsService,
  ) {}

  async getCategories() {
    const categories = await this.categoryRepository.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });

    return {
      success: true,
      data: categories.map(category => ({
        id: category.id,
        name: category.name,
        icon: category.icon || '📦', // Default icon
        description: category.description,
      })),
    };
  }

  async getCategoryItems(categoryId: string, searchParams: SearchItemsDto = {}) {
    // Use the existing items service with category filter
    const searchDto = { ...searchParams, category: categoryId };
    return this.itemsService.findAll(searchDto);
  }

}

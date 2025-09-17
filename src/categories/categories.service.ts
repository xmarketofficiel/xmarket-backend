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

  async seedCategories() {
    const categories = [
      { name: 'Electronics', icon: '📱', description: 'Phones, laptops, gadgets' },
      { name: 'Books', icon: '📚', description: 'Textbooks, novels, academic materials' },
      { name: 'Clothing', icon: '👕', description: 'Fashion, accessories, shoes' },
      { name: 'Furniture', icon: '🪑', description: 'Tables, chairs, storage' },
      { name: 'Sports', icon: '⚽', description: 'Equipment, gear, accessories' },
      { name: 'Other', icon: '📦', description: 'Miscellaneous items' },
    ];

    const savedCategories = [];
    for (const categoryData of categories) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: categoryData.name }
      });

      if (!existingCategory) {
        const category = this.categoryRepository.create({
          ...categoryData,
          isActive: true,
        });
        const saved = await this.categoryRepository.save(category);
        savedCategories.push(saved);
      }
    }

    return {
      success: true,
      message: `Seeded ${savedCategories.length} categories`,
      data: savedCategories,
    };
  }

  async getCategoryItems(categoryId: string, searchParams: SearchItemsDto = {}) {
    // Use the existing items service with category filter
    const searchDto = { ...searchParams, category: categoryId };
    return this.itemsService.findAll(searchDto);
  }

}

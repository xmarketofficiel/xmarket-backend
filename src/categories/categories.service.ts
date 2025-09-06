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

  async seedCategories() {
    // Default categories for marketplace
    const defaultCategories = [
      { name: 'Electronics', icon: '📱', description: 'Phones, laptops, gadgets' },
      { name: 'Books', icon: '📚', description: 'Textbooks, novels, study materials' },
      { name: 'Clothing', icon: '👕', description: 'Clothes, shoes, accessories' },
      { name: 'Furniture', icon: '🪑', description: 'Chairs, desks, home decor' },
      { name: 'Sports', icon: '⚽', description: 'Sports equipment, fitness gear' },
      { name: 'Transportation', icon: '🚗', description: 'Bikes, scooters, car accessories' },
      { name: 'Services', icon: '🔧', description: 'Tutoring, cleaning, repairs' },
      { name: 'Other', icon: '📦', description: 'Miscellaneous items' },
    ];

    for (const categoryData of defaultCategories) {
      const existingCategory = await this.categoryRepository.findOne({
        where: { name: categoryData.name },
      });

      if (!existingCategory) {
        const category = this.categoryRepository.create(categoryData);
        await this.categoryRepository.save(category);
      }
    }

    return {
      success: true,
      message: 'Categories seeded successfully',
    };
  }
}

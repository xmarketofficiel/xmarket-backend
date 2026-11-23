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
      data: categories.filter(category => category.name.trim().toLowerCase() !== 'services').map(category => ({
        id: category.id,
        name: category.name,
        icon: category.icon || '📦', // Default icon
        description: category.description,
      })),
    };
  }

  async seedCategories() {
    const categories = [
      { name: 'Electronics', icon: '📱', description: 'Phones, laptops, gadgets & technology' },
      { name: 'Books', icon: '📚', description: 'Textbooks, novels, academic materials' },
      { name: 'Clothing', icon: '👕', description: 'Fashion, accessories, shoes & apparel' },
      { name: 'Furniture', icon: '🪑', description: 'Tables, chairs, storage & home decor' },
      { name: 'Sports', icon: '⚽', description: 'Equipment, gear, fitness & outdoor activities' },
      { name: 'Transportation', icon: '🚗', description: 'Bikes, scooters, car parts & vehicle accessories' },
      { name: 'Health & Beauty', icon: '💄', description: 'Cosmetics, skincare, wellness products' },
      { name: 'Art & Crafts', icon: '🎨', description: 'Art supplies, crafts & creative materials' },
      { name: 'Music & Instruments', icon: '🎵', description: 'Musical instruments & audio equipment' },
      { name: 'Home & Garden', icon: '🏡', description: 'Home essentials, garden supplies & tools' },
      { name: 'Toys & Games', icon: '🎲', description: 'Toys, board games & entertainment' },
      { name: 'Pet Supplies', icon: '🐾', description: 'Pet food, toys, accessories & care items' },
      { name: 'Office Supplies', icon: '📋', description: 'Office equipment, stationery & workspace items' },
      { name: 'Food & Beverages', icon: '🍕', description: 'Food, drinks & kitchen essentials' },
      { name: 'Other', icon: '📦', description: 'Miscellaneous items not fitting other categories' },
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

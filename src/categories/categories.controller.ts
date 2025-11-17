import { Controller, Get, Param, Query, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { SearchItemsDto } from '../items/dto/search-items.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async getCategories() {
    const data = await this.categoriesService.getCategories();
    return data;
  }

  @Get(':id/items')
  async getCategoryItems(
    @Param('id') categoryId: string,
    @Query() searchParams: SearchItemsDto,
  ) {
    return this.categoriesService.getCategoryItems(categoryId, searchParams);
  }

  @Get('seed')
  @Public()
  async seedCategories() {
    // Only allow seeding in development environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Seeding is not allowed in production');
    }
    return this.categoriesService.seedCategories();
  }
}

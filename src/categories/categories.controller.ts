import { Controller, Get, Param, Query, Post } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { SearchItemsDto } from '../items/dto/search-items.dto';
import { Public } from '../common/decorators/public.decorator';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get()
  async getCategories() {
    return this.categoriesService.getCategories();
  }

  @Public()
  @Get(':id/items')
  async getCategoryItems(
    @Param('id') categoryId: string,
    @Query() searchParams: SearchItemsDto,
  ) {
    return this.categoriesService.getCategoryItems(categoryId, searchParams);
  }

  @Public()
  @Post('seed')
  async seedCategories() {
    return this.categoriesService.seedCategories();
  }
}

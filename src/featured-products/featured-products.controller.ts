import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FeaturedProductsService } from './featured-products.service';
import { FeaturedProduct } from './entities/featured-product.entity';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('featured-products')
@Controller('featured-products')
export class FeaturedProductsController {
  constructor(private readonly featuredProductsService: FeaturedProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ 
    summary: 'Get featured products for landing page',
    description: 'Public endpoint to fetch featured products. No authentication required.' 
  })
  @ApiQuery({ 
    name: 'limit', 
    required: false, 
    type: Number, 
    description: 'Number of products to return (default: 6, max: 12)' 
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns list of featured products',
    type: [FeaturedProduct] 
  })
  async getFeaturedProducts(
    @Query('limit') limit?: string,
  ): Promise<FeaturedProduct[]> {
    const productLimit = limit ? Math.min(parseInt(limit, 10), 12) : 6;
    return this.featuredProductsService.getFeaturedProducts(productLimit);
  }
}

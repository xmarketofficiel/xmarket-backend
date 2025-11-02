import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeaturedProductsController } from './featured-products.controller';
import { FeaturedProductsService } from './featured-products.service';
import { FeaturedProduct } from './entities/featured-product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([FeaturedProduct])],
  controllers: [FeaturedProductsController],
  providers: [FeaturedProductsService],
  exports: [FeaturedProductsService],
})
export class FeaturedProductsModule {}

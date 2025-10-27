import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FeaturedProduct } from './entities/featured-product.entity';

@Injectable()
export class FeaturedProductsService {
  constructor(
    @InjectRepository(FeaturedProduct)
    private featuredProductsRepository: Repository<FeaturedProduct>,
  ) {}

  /**
   * Get featured products for landing page
   * Returns active featured products ordered by creation date
   */
  async getFeaturedProducts(limit: number = 6): Promise<FeaturedProduct[]> {
    return this.featuredProductsRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Admin: Add a product to featured products
   */
  async addFeaturedProduct(
    itemId: number,
    title: string,
    price: number,
    imageUrl: string,
    category: string,
  ): Promise<FeaturedProduct> {
    const featuredProduct = this.featuredProductsRepository.create({
      itemId,
      title,
      price,
      imageUrl,
      category,
    });

    return this.featuredProductsRepository.save(featuredProduct);
  }

  /**
   * Admin: Remove a product from featured products
   */
  async removeFeaturedProduct(id: number): Promise<void> {
    await this.featuredProductsRepository.delete(id);
  }

  /**
   * Admin: Update featured product
   */
  async updateFeaturedProduct(
    id: number,
    updates: Partial<FeaturedProduct>,
  ): Promise<FeaturedProduct> {
    await this.featuredProductsRepository.update(id, updates);
    return this.featuredProductsRepository.findOne({ where: { id } });
  }

  /**
   * Admin: Get all featured products
   */
  async getAllFeaturedProducts(): Promise<FeaturedProduct[]> {
    return this.featuredProductsRepository.find({
      order: { createdAt: 'DESC' },
    });
  }
}

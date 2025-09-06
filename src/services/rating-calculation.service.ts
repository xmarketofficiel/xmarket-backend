import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Service } from './entities/service.entity';
import { Rating } from './entities/rating.entity';

@Injectable()
export class RatingCalculationService {

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Service)
    private serviceRepository: Repository<Service>,
    @InjectRepository(Rating)
    private ratingRepository: Repository<Rating>,
  ) {}

  async calculateUserRating(userId: string): Promise<{ average: number; total: number }> {
    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .addSelect('COUNT(rating.id)', 'total')
      .where('rating.ratedUserId = :userId', { userId })
      .andWhere('rating.isActive = :isActive', { isActive: true })
      .getRawOne();

    const average = parseFloat(result?.average) || 0;
    const total = parseInt(result?.total) || 0;

    return {
      average: Math.round(average * 100) / 100, // Round to 2 decimal places
      total,
    };
  }

  async calculateServiceRating(serviceId: string): Promise<{ average: number; total: number }> {
    const result = await this.ratingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'average')
      .addSelect('COUNT(rating.id)', 'total')
      .where('rating.serviceId = :serviceId', { serviceId })
      .andWhere('rating.isActive = :isActive', { isActive: true })
      .getRawOne();

    const average = parseFloat(result?.average) || 0;
    const total = parseInt(result?.total) || 0;

    return {
      average: Math.round(average * 100) / 100, // Round to 2 decimal places
      total,
    };
  }

  async updateUserRating(userId: string): Promise<void> {
    const { average, total } = await this.calculateUserRating(userId);
    
    await this.userRepository.update(userId, {
      averageRating: average,
      totalRatings: total,
    });
  }

  async updateServiceRating(serviceId: string): Promise<void> {
    const { average, total } = await this.calculateServiceRating(serviceId);
    
    await this.serviceRepository.update(serviceId, {
      averageRating: average,
      totalRatings: total,
    });
  }

  async updateAllRatingsForUser(userId: string): Promise<void> {
    // Update user rating
    await this.updateUserRating(userId);

    // Update all service ratings for this user
    const userServices = await this.serviceRepository.find({
      where: { userId },
      select: ['id'],
    });

    for (const service of userServices) {
      await this.updateServiceRating(service.id);
    }
  }
}
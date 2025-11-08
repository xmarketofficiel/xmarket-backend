import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Interest } from './entities/interest.entity';
import { CreateInterestDto } from './dto/create-interest.dto';

@Injectable()
export class InterestsService {
  constructor(
    @InjectRepository(Interest)
    private interestsRepository: Repository<Interest>,
  ) {}

  async create(createInterestDto: CreateInterestDto, userId: number): Promise<Interest> {
    // Allow multiple interests - each expression creates a new record
    // This allows tracking the history of interest expressions
    const interest = this.interestsRepository.create({
      ...createInterestDto,
      userId,
    });

    return this.interestsRepository.save(interest);
  }

  async findByItem(itemId: number): Promise<Interest[]> {
    return this.interestsRepository.find({
      where: { itemId, isActive: true },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByUser(userId: number): Promise<Interest[]> {
    return this.interestsRepository
      .createQueryBuilder('interest')
      .leftJoinAndSelect('interest.item', 'item')
      .leftJoin('item.seller', 'seller')
      .addSelect([
        'seller.id',
        'seller.fullName',
        'seller.firstName',
        'seller.lastName',
        'seller.email',
        'seller.profileImageUrl',
        'seller.profileImageSpacesUrl',
        'seller.isVerified'
      ])
      .leftJoinAndSelect('item.images', 'images')
      .where('interest.userId = :userId', { userId })
      .andWhere('interest.isActive = :isActive', { isActive: true })
      .orderBy('interest.createdAt', 'DESC')
      .getMany();
  }

  async remove(id: number, userId: number): Promise<void> {
    const interest = await this.interestsRepository.findOne({
      where: { id, userId },
    });

    if (!interest) {
      throw new NotFoundException(`Interest with ID ${id} not found`);
    }

    interest.isActive = false;
    await this.interestsRepository.save(interest);
  }
}
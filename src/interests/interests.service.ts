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
    // Check if user already showed interest in this item
    const existingInterest = await this.interestsRepository.findOne({
      where: { userId, itemId: createInterestDto.itemId, isActive: true },
    });

    if (existingInterest) {
      throw new ConflictException('You have already shown interest in this item');
    }

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
    return this.interestsRepository.find({
      where: { userId, isActive: true },
      relations: ['item', 'item.seller', 'item.images'],
      order: { createdAt: 'DESC' },
    });
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
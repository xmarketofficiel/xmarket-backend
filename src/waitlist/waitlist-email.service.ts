import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEmail } from '../entities/waitlist-email.entity';

export interface CreateWaitlistEmailDto {
  email: string;
  user_agent?: string;
  ip_address?: string;
  referrer?: string;
  notes?: string;
}

@Injectable()
export class WaitlistEmailService {
  constructor(
    @InjectRepository(WaitlistEmail)
    private waitlistEmailRepository: Repository<WaitlistEmail>,
  ) {}

  async create(createWaitlistEmailDto: CreateWaitlistEmailDto): Promise<WaitlistEmail> {
    try {
      const waitlistEmail = this.waitlistEmailRepository.create(createWaitlistEmailDto);
      return await this.waitlistEmailRepository.save(waitlistEmail);
    } catch (error) {
      if (error.code === '23505') { // PostgreSQL unique violation
        throw new ConflictException('Email already exists in waitlist');
      }
      throw error;
    }
  }

  async findAll(): Promise<WaitlistEmail[]> {
    return this.waitlistEmailRepository.find({
      order: { created_at: 'DESC' }
    });
  }

  async findByEmail(email: string): Promise<WaitlistEmail | null> {
    return this.waitlistEmailRepository.findOne({
      where: { email }
    });
  }

  async getStats() {
    const total = await this.waitlistEmailRepository.count();
    const notified = await this.waitlistEmailRepository.count({
      where: { is_notified: true }
    });
    const pending = total - notified;

    return {
      total,
      notified,
      pending,
    };
  }

  async markAsNotified(email: string): Promise<void> {
    await this.waitlistEmailRepository.update(
      { email },
      { is_notified: true, updated_at: new Date() }
    );
  }

  async remove(id: string): Promise<void> {
    await this.waitlistEmailRepository.delete(id);
  }
}

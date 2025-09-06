import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JoinRequest } from './entities/join-request.entity';
import { JoinRequestStatus } from './enums/join-request-status.enum';
import { CreateJoinRequestDto } from './dto/create-join-request.dto';
import { UpdateJoinRequestDto } from './dto/update-join-request.dto';

@Injectable()
export class JoinRequestsService {
  constructor(
    @InjectRepository(JoinRequest)
    private joinRequestsRepository: Repository<JoinRequest>,
  ) {}

  async create(createJoinRequestDto: CreateJoinRequestDto): Promise<JoinRequest> {
    // Check if email already exists
    const existingRequest = await this.joinRequestsRepository.findOne({
      where: { email: createJoinRequestDto.email }
    });

    if (existingRequest) {
      throw new ConflictException('A request with this email already exists');
    }

    const joinRequest = this.joinRequestsRepository.create(createJoinRequestDto);
    return this.joinRequestsRepository.save(joinRequest);
  }

  async findAll(): Promise<JoinRequest[]> {
    return this.joinRequestsRepository.find({
      order: { createdAt: 'DESC' }
    });
  }

  async findPending(): Promise<JoinRequest[]> {
    return this.joinRequestsRepository.find({
      where: { status: JoinRequestStatus.PENDING },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: number): Promise<JoinRequest> {
    const joinRequest = await this.joinRequestsRepository.findOne({
      where: { id }
    });

    if (!joinRequest) {
      throw new NotFoundException(`Join request with ID ${id} not found`);
    }

    return joinRequest;
  }

  async update(id: number, updateJoinRequestDto: UpdateJoinRequestDto): Promise<JoinRequest> {
    const joinRequest = await this.findOne(id);
    
    // If status is being updated, set reviewed timestamp
    if (updateJoinRequestDto.status && updateJoinRequestDto.status !== joinRequest.status) {
      updateJoinRequestDto.reviewedAt = new Date();
    }

    Object.assign(joinRequest, updateJoinRequestDto);
    return this.joinRequestsRepository.save(joinRequest);
  }

  async remove(id: number): Promise<void> {
    const joinRequest = await this.findOne(id);
    await this.joinRequestsRepository.remove(joinRequest);
  }

  async getStats() {
    const total = await this.joinRequestsRepository.count();
    const pending = await this.joinRequestsRepository.count({
      where: { status: JoinRequestStatus.PENDING }
    });
    const approved = await this.joinRequestsRepository.count({
      where: { status: JoinRequestStatus.APPROVED }
    });
    const rejected = await this.joinRequestsRepository.count({
      where: { status: JoinRequestStatus.REJECTED }
    });

    return {
      total,
      pending,
      approved,
      rejected
    };
  }
}

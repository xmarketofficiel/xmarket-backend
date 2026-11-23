import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Service } from './service.entity';

export enum ContactStatus {
  CONTACTED = 'contacted',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_RESPONSE = 'no_response',
  FOLLOW_UP_SENT = 'follow_up_sent',
  RATED = 'rated',
}

@Entity('contact_events')
@Index(['customerId'])
@Index(['sellerId'])
@Index(['serviceId'])
@Index(['contactedAt'])
@Index(['status'])
export class ContactEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('int')
  customerId: number;

  @Column('int')
  sellerId: number;

  @Column('uuid')
  serviceId: string;

  @Column({ type: 'enum', enum: ContactStatus, default: ContactStatus.CONTACTED })
  status: ContactStatus;

  @Column({ default: 'whatsapp' })
  platform: string;

  @Column({ type: 'timestamp', nullable: true })
  followUpSentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  customerFeedback: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  contactedAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customerId' })
  customer: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceId' })
  service: Service;
}

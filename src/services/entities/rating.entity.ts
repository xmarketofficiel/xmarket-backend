import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Service } from './service.entity';

@Entity('ratings')
@Index(['serviceId'])
@Index(['ratedUserId'])
@Index(['ratingUserId'])
@Index(['createdAt'])
@Unique(['serviceId', 'ratingUserId']) // One rating per user per service
export class Rating {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', width: 1 })
  rating: number; // 1-5 scale

  @Column('text', { nullable: true })
  comment: string;

  @Column('uuid')
  serviceId: string;

  @Column('uuid')
  ratedUserId: string; // User who receives the rating (service owner)

  @Column('uuid')
  ratingUserId: string; // User who gives the rating

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => Service, (service) => service.ratings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'serviceId' })
  service: Service;

  @ManyToOne(() => User, (user) => user.receivedRatings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ratedUserId' })
  ratedUser: User;

  @ManyToOne(() => User, (user) => user.givenRatings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ratingUserId' })
  ratingUser: User;
}
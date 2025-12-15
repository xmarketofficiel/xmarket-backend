import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { ServiceCategory as ServiceCategoryEntity } from './service-category.entity';
import { User } from '../../users/entities/user.entity';
import { Rating } from './rating.entity';

@Entity('services')
@Index(['serviceCategoryId'])
@Index(['location'])
@Index(['title'])
@Index(['isActive'])
@Index(['createdAt'])
@Index(['departureTime'])
export class Service {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({ name: 'price_from', type: 'decimal', precision: 10, scale: 2 })
  priceFrom: number;

  @Column({ name: 'price_to', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceTo: number;

  @Column('uuid', { name: 'service_category_id' })
  serviceCategoryId: string;

  @Column({
    type: 'enum',
    enum: ['time-based', 'ongoing'],
    default: 'ongoing',
  })
  type: string;

  @Column({
    type: 'enum',
    enum: ['instant', 'scheduled'],
    default: 'instant',
  })
  availability: string;

  @Column({ nullable: true })
  duration: string;

  @Column({ name: 'departure_time', type: 'timestamp', nullable: true })
  departureTime: Date;

  @Column({ nullable: true })
  distance: string;

  @Column({ nullable: true })
  location: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string;

  @Column({ default: false })
  featured: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number;

  @Column('uuid')
  userId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.services, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => ServiceCategoryEntity, (category) => category.services)
  @JoinColumn({ name: 'service_category_id' })
  serviceCategory: ServiceCategoryEntity;

  @OneToMany(() => Rating, (rating) => rating.service)
  ratings: Rating[];
}
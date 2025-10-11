import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { Item } from '../../items/entities/item.entity';
import { Interest } from '../../interests/entities/interest.entity';
import { Rating } from '../../services/entities/rating.entity';
import { Service } from '../../services/entities/service.entity';

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'full_name', nullable: true })
  fullName: string;

  @Column({ name: 'first_name' })
  firstName: string;

  @Column({ name: 'last_name' })
  lastName: string;

  @Column()
  department: string;

  @Column({ type: 'enum', enum: ['student', 'staff'] ,nullable: true})
  userRole: 'student' | 'staff';

  @Column()
  address: string;

  @Column({ unique: true })
  email: string;

  @Column({ name: 'whatsapp_number' })
  whatsappNumber: string;

  @Column({ name: 'password_hash' })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'profile_image_url', nullable: true })
  profileImageUrl: string;

  @Column({ name: 'profile_image_spaces_url', nullable: true })
  profileImageSpacesUrl: string;

  @Column({ name: 'profile_image_spaces_key', nullable: true })
  profileImageSpacesKey: string;

  @Column({ name: 'profile_image_variants', type: 'json', nullable: true })
  profileImageVariants: { [key: string]: string };

  @Column({ name: 'show_sold_items', default: true })
  showSoldItems: boolean;

  @Column({ name: 'show_purchases', default: true })
  showPurchases: boolean;

  @Column({ name: 'show_phone', default: false })
  showPhone: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'last_login', nullable: true })
  lastLogin: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Item, item => item.seller)
  items: Item[];

  @OneToMany(() => Interest, interest => interest.user)
  interests: Interest[];

  @OneToMany(() => Rating, (rating) => rating.ratedUser)
  receivedRatings: Rating[];

  @OneToMany(() => Rating, (rating) => rating.ratingUser)
  givenRatings: Rating[];

  @OneToMany(() => Service, (service) => service.user)
  services: Service[];

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ default: 0 })
  totalRatings: number;
}
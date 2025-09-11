import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { ItemImage } from './item-image.entity';
import { Interest } from '../../interests/entities/interest.entity';

@Entity('items')
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'seller_id' })
  sellerId: number;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 8, scale: 2 })
  price: number;

  @Column('decimal', { precision: 8, scale: 2, nullable: true })
  maxPrice: number;

  @Column({ default: 1 })
  quantity: number;

  @Column()
  category: string;

  @Column()
  condition: string;

  @Column({ name: 'is_sold', default: false })
  isSold: boolean;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'anonymous', default: false })
  anonymous: boolean;

  @Column({ name: 'view_count', default: 0 })
  viewCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, user => user.items)
  @JoinColumn({ name: 'seller_id' })
  seller: User;

  @OneToMany(() => ItemImage, itemImage => itemImage.item)
  images: ItemImage[];

  @OneToMany(() => Interest, interest => interest.item)
  interests: Interest[];
}
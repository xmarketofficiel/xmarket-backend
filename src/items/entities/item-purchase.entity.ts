import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Index, Unique } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Item } from './item.entity';

export enum PurchaseStatus {
  PENDING = 'pending',
  BUYER_CONFIRMED = 'buyer_confirmed', // NEW: Buyer confirmed, waiting for seller
  CONFIRMED = 'confirmed',
  DECLINED = 'declined',
  COMPLETED = 'completed'
}

@Entity('item_purchases')
@Unique(['buyerId', 'itemId', 'interestSequence']) // Allow multiple interests with sequence numbers
@Index(['buyerId', 'status'])
@Index(['itemId', 'status'])
export class ItemPurchase {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  buyerId: number;

  @Column()
  itemId: number;

  @Column({
    type: 'enum',
    enum: PurchaseStatus,
    default: PurchaseStatus.PENDING
  })
  status: PurchaseStatus;

  @Column({ type: 'text', nullable: true })
  buyerNotes: string;

  @Column({ type: 'text', nullable: true })
  sellerNotes: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  agreedPrice: number;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  sellerConfirmedAt: Date; // NEW: When seller confirms the purchase

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'int', default: 1 })
  interestSequence: number; // Sequence number for multiple interests from same buyer

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  interestTimestamp: Date; // Unique timestamp for each interest to bypass constraints

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: 'itemId' })
  item: Item;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum NotificationType {
  MESSAGE = 'message',
  ITEM_INTEREST = 'item_interest',
  ITEM_SOLD = 'item_sold',
  PURCHASE_CONFIRMATION = 'purchase_confirmation', // NEW: For seller confirmation needed
  SYSTEM = 'system',
}

@Entity('notifications')
@Index(['recipient', 'isRead'])
@Index(['recipient', 'createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  recipient: User;

  @Column({ type: 'enum', enum: NotificationType })
  type: NotificationType;

  @Column()
  title: string;

  @Column('text')
  message: string;

  @Column({ type: 'json', nullable: true })
  data: any; // Additional data (item id, user id, etc.)

  @Column({ default: false })
  isRead: boolean;

  @CreateDateColumn()
  createdAt: Date;
}

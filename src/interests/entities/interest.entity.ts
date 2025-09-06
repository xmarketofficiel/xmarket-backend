import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Item } from '../../items/entities/item.entity';

@Entity('interests')
export class Interest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'item_id' })
  itemId: number;

  @Column({ nullable: true })
  message: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => User, user => user.interests)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Item, item => item.interests)
  @JoinColumn({ name: 'item_id' })
  item: Item;
}
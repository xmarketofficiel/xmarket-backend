import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Item } from './item.entity';

@Entity('item_favorites')
@Index(['user', 'item'], { unique: true }) // Prevent duplicate favorites
export class ItemFavorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @ManyToOne(() => Item, { eager: true })
  item: Item;

  @CreateDateColumn()
  createdAt: Date;
}

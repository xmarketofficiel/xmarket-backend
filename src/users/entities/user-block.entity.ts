import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('user_blocks')
@Index(['blocker', 'blocked'], { unique: true }) // Prevent duplicate blocks
export class UserBlock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.id)
  blocker: User;

  @ManyToOne(() => User, user => user.id)
  blocked: User;

  @CreateDateColumn()
  createdAt: Date;
}

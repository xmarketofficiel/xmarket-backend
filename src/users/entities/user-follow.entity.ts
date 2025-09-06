import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Index } from 'typeorm';
import { User } from './user.entity';

@Entity('user_follows')
@Index(['follower', 'following'], { unique: true }) // Prevent duplicate follows
export class UserFollow {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.id)
  follower: User;

  @ManyToOne(() => User, user => user.id)
  following: User;

  @CreateDateColumn()
  createdAt: Date;
}

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Item } from '../../items/entities/item.entity';
import { Message } from './message.entity';

@Entity('conversations')
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'participant_one_id' })
  participantOneId: number;

  @Column({ name: 'participant_two_id' })
  participantTwoId: number;

  @Column({ name: 'item_id', nullable: true })
  itemId: number;

  @Column({ name: 'last_message_at', nullable: true })
  lastMessageAt: Date;

  @Column({ name: 'participant_one_unread_count', default: 0 })
  participantOneUnreadCount: number;

  @Column({ name: 'participant_two_unread_count', default: 0 })
  participantTwoUnreadCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'participant_one_id' })
  participantOne: User;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'participant_two_id' })
  participantTwo: User;

  @ManyToOne(() => Item, { eager: true })
  @JoinColumn({ name: 'item_id' })
  item: Item;

  @OneToMany(() => Message, message => message.conversation)
  messages: Message[];

  // Helper methods for frontend compatibility
  getOtherParticipant(currentUserId: number): User {
    return this.participantOneId === currentUserId ? this.participantTwo : this.participantOne;
  }

  getUnreadCountForUser(userId: number): number {
    return this.participantOneId === userId 
      ? this.participantOneUnreadCount 
      : this.participantTwoUnreadCount;
  }
}

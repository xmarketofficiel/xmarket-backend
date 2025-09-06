import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, Index } from 'typeorm';
import { User } from './user.entity';

export enum UserReportStatus {
  PENDING = 'pending',
  REVIEWED = 'reviewed',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
}

@Entity('user_reports')
@Index(['reporter', 'reportedUser'])
@Index(['status'])
export class UserReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  reporter: User;

  @ManyToOne(() => User, { eager: true })
  reportedUser: User;

  @Column()
  reason: string;

  @Column({ type: 'enum', enum: UserReportStatus, default: UserReportStatus.PENDING })
  status: UserReportStatus;

  @Column({ nullable: true })
  adminNotes: string;

  @CreateDateColumn()
  createdAt: Date;
}

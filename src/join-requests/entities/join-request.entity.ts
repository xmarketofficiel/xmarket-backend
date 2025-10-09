import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { JoinRequestStatus } from '../enums/join-request-status.enum';

@Entity('join_requests')
export class JoinRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  fullName: string;

  @Column({ type: 'varchar', length: 100 })
  firstName: string;

  @Column({ type: 'varchar', length: 100 })
  lastName: string;

  @Column({ type: 'varchar', length: 200 })
  department: string;

  @Column({ type: 'enum', enum: ['student', 'staff'] })
  role: 'student' | 'staff';

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20 })
  whatsappNumber: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: JoinRequestStatus.PENDING
  })
  status: JoinRequestStatus;

  @Column({ type: 'int', nullable: true })
  reviewedBy: number;

  @Column({ type: 'text', nullable: true })
  reviewNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt: Date;
}

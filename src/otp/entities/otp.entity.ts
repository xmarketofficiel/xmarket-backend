import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('otps')
export class Otp {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @Column()
  code: string;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: false })
  verified: boolean;

  @Column({ default: 'registration' })
  type: string; // registration, password_reset

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
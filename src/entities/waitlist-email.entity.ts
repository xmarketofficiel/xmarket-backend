import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('waitlist_emails')
@Index('idx_waitlist_emails_email', ['email'])
@Index('idx_waitlist_emails_created_at', ['created_at'])
export class WaitlistEmail {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ 
    type: 'varchar', 
    length: 255, 
    unique: true,
    comment: 'Email address of the subscriber'
  })
  email: string;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'User agent string from the browser'
  })
  user_agent: string;

  @Column({ 
    type: 'varchar', 
    length: 45, 
    nullable: true,
    comment: 'IP address of the subscriber'
  })
  ip_address: string;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'Referrer URL'
  })
  referrer: string;

  @CreateDateColumn({ 
    type: 'timestamp with time zone',
    comment: 'When the email was added to waitlist'
  })
  created_at: Date;

  @UpdateDateColumn({ 
    type: 'timestamp with time zone',
    comment: 'Last updated timestamp'
  })
  updated_at: Date;

  @Column({ 
    type: 'boolean', 
    default: false,
    comment: 'Whether the subscriber has been notified of launch'
  })
  is_notified: boolean;

  @Column({ 
    type: 'text', 
    nullable: true,
    comment: 'Additional notes about the subscriber'
  })
  notes: string;
}

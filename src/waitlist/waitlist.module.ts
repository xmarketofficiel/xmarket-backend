import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEmail } from '../entities/waitlist-email.entity';
import { WaitlistEmailService } from './waitlist-email.service';
import { WaitlistController } from './waitlist.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WaitlistEmail])],
  providers: [WaitlistEmailService],
  controllers: [WaitlistController],
  exports: [WaitlistEmailService],
})
export class WaitlistModule {}

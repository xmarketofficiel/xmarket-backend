import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { ContactEvent } from '../services/entities/contact-event.entity';
import { Service } from '../services/entities/service.entity';
import { User } from '../users/entities/user.entity';
import { EmailModule } from '../email/email.module';
import { FollowUpProcessor } from './processors/follow-up.processor';
import { NotificationQueueService } from './services/notification-queue.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, ContactEvent, Service, User]),
    BullModule.registerQueue({
      name: 'follow-up-notifications',
    }),
    ScheduleModule.forRoot(),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    EmailModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationQueueService,
    FollowUpProcessor,
  ],
  exports: [NotificationsService, NotificationQueueService],
})
export class NotificationsModule {}

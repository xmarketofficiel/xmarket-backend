import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';
import { ServiceCategory } from './entities/service-category.entity';
import { Rating } from './entities/rating.entity';
import { ContactEvent } from './entities/contact-event.entity';
import { User } from '../users/entities/user.entity';
import { RatingCalculationService } from './rating-calculation.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { ServiceCategoriesController } from './service-categories.controller';
import { ServiceCategoriesService } from './service-categories.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, ServiceCategory, Rating, ContactEvent, User]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [ServicesService, ServiceCategoriesService, RatingCalculationService],
  exports: [ServicesService, ServiceCategoriesService],
})
export class ServicesModule {}
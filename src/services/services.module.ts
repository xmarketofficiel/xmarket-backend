import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { Service } from './entities/service.entity';
import { Rating } from './entities/rating.entity';
import { User } from '../users/entities/user.entity';
import { RatingCalculationService } from './rating-calculation.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Service, Rating, User])
  ],
  controllers: [ServicesController],
  providers: [ServicesService, RatingCalculationService],
  exports: [ServicesService],
})
export class ServicesModule {}
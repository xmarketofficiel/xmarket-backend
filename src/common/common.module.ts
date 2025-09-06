import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageProcessingService } from './services/image-processing.service';
import { CloudinaryService } from './services/cloudinary.service';
import { ImageProcessingController } from './controllers/image-processing.controller';

@Module({
  imports: [ConfigModule],
  providers: [ImageProcessingService, CloudinaryService],
  controllers: [ImageProcessingController],
  exports: [ImageProcessingService, CloudinaryService],
})
export class CommonModule {}

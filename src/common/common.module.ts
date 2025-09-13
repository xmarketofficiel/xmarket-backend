import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ImageProcessingService } from './services/image-processing.service';
import { CloudinaryService } from './services/cloudinary.service';
import { ImageProcessingController } from './controllers/image-processing.controller';
import { DualImageService } from '../storage/dual-image.service';
import { SpacesService } from '../storage/spaces.service';

@Module({
  imports: [ConfigModule],
  providers: [ImageProcessingService, CloudinaryService, DualImageService, SpacesService],
  controllers: [ImageProcessingController],
  exports: [ImageProcessingService, CloudinaryService, DualImageService, SpacesService],
})
export class CommonModule {}

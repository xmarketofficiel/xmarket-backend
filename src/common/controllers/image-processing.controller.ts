import { Controller, Post, UploadedFile, UseInterceptors, Get } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageProcessingService } from '../services/image-processing.service';
import { CloudinaryService, ImageUploadResult } from '../services/cloudinary.service';

@Controller('image-processing')
export class ImageProcessingController {
  constructor(
    private readonly imageProcessingService: ImageProcessingService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Get('sizes')
  getImageSizes() {
    return {
      message: 'Available image sizes and configurations',
      sizes: this.imageProcessingService.getImageSizeInfo(),
    };
  }

  @Post('test-upload')
  @UseInterceptors(FileInterceptor('image'))
  async testImageUpload(@UploadedFile() file: Express.Multer.File): Promise<{
    message: string;
    result: ImageUploadResult;
  }> {
    if (!file) {
      throw new Error('No file uploaded');
    }

    const result = await this.cloudinaryService.uploadImage(file, 'test-uploads');
    
    return {
      message: 'Image processed and uploaded successfully with multiple sizes',
      result,
    };
  }
}

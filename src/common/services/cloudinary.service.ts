import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';
import { ImageProcessingService, ProcessedImages } from './image-processing.service';

export interface ImageUploadResult {
  url: string;
  publicId: string;
  metadata: {
    filename: string;
    width: number;
    height: number;
    size: number;
  };
}

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(
    private configService: ConfigService,
    private imageProcessingService: ImageProcessingService,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'marketplace-items'
  ): Promise<ImageUploadResult> {
    try {
      // Enhanced validation with intelligent feedback
      const validation = await this.imageProcessingService.validateImage(file.buffer);
      
      if (!validation.valid) {
        throw new BadRequestException(validation.message || 'Invalid image file');
      }

      // Log warnings if any
      if (validation.warnings && validation.warnings.length > 0) {
        validation.warnings.forEach(warning => this.logger.warn(warning));
      }

      this.logger.log(`Processing image: ${file.originalname} (${Math.round(file.buffer.length / 1024)}KB)`);

      // Process image to optimal size using our backend processing
      const processedImages = await this.imageProcessingService.processImage(
        file.buffer,
        file.originalname,
      );

      // Upload the single optimized image to Cloudinary
      const result = await this.uploadToCloudinary(
        processedImages.optimized.buffer,
        this.getBaseFilename(file.originalname),
        folder,
      );

      const uploadResult: ImageUploadResult = {
        url: result.url,
        publicId: result.publicId,
        metadata: {
          filename: file.originalname,
          width: processedImages.optimized.metadata.width,
          height: processedImages.optimized.metadata.height,
          size: processedImages.optimized.metadata.size,
        }
      };

      this.logger.log(`Successfully uploaded ${file.originalname} as single optimized image (800x800)`);
      
      return uploadResult;
    } catch (error) {
      this.logger.error(`Failed to upload image ${file.originalname}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Image upload failed: ${error.message}`);
    }
  }

  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'marketplace-items'
  ): Promise<ImageUploadResult[]> {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.uploadImage(file, folder);
        results.push(result);
      } catch (error) {
        this.logger.error(`Failed to upload ${file.originalname}:`, error);
        throw error;
      }
    }

    return results;
  }

  private async uploadToCloudinary(
    buffer: Buffer,
    filename: string,
    folder: string,
  ): Promise<{ url: string; publicId: string }> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: 'image',
          public_id: filename,
          folder,
          overwrite: true,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          // No additional transformations since we've already processed the image
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Cloudinary upload error for ${filename}:`, error);
            reject(new BadRequestException('Failed to upload to Cloudinary'));
          } else {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          }
        },
      ).end(buffer);
    });
  }

  private getBaseFilename(originalFilename: string): string {
    const timestamp = Date.now();
    const nameWithoutExt = originalFilename.split('.').slice(0, -1).join('.');
    return `${nameWithoutExt}_${timestamp}`;
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      if (result.result !== 'ok') {
        console.warn(`Failed to delete image with publicId: ${publicId}`, result);
      }
    } catch (error) {
      console.error('Failed to delete image from Cloudinary:', error);
      // Don't throw error here to avoid breaking the main operation
    }
  }

  async deleteMultipleImages(publicIds: string[]): Promise<void> {
    const deletePromises = publicIds.map(publicId => this.deleteImage(publicId));
    await Promise.all(deletePromises);
  }

  // Legacy method for backward compatibility
  async uploadImageLegacy(
    file: Express.Multer.File,
    folder: string = 'marketplace-items'
  ): Promise<{ url: string; publicId: string }> {
    const result = await this.uploadImage(file, folder);
    return {
      url: result.url, // Return the single optimized URL
      publicId: result.publicId,
    };
  }

  // Legacy method for backward compatibility with multiple images
  async uploadMultipleImagesLegacy(
    files: Express.Multer.File[],
    folder: string = 'marketplace-items'
  ): Promise<{ url: string; publicId: string }[]> {
    const results = [];

    for (const file of files) {
      const result = await this.uploadImageLegacy(file, folder);
      results.push(result);
    }

    return results;
  }

  // Generate optimized URLs for different use cases
  generateOptimizedUrl(publicId: string, options: {
    width?: number;
    height?: number;
    quality?: string;
    crop?: string;
  } = {}): string {
    return cloudinary.url(publicId, {
      width: options.width || 800,
      height: options.height || 600,
      crop: options.crop || 'fill',
      quality: options.quality || 'auto:good',
      fetch_format: 'auto'
    });
  }

  // Generate thumbnail URL
  generateThumbnailUrl(publicId: string): string {
    return this.generateOptimizedUrl(publicId, {
      width: 300,
      height: 200,
      crop: 'fill'
    });
  }
}

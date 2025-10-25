import { Injectable, Logger } from '@nestjs/common';
import * as sharp from 'sharp';
import { Buffer } from 'buffer';

export interface ImageSizeConfig {
  width: number;
  height: number;
  quality: number;
  description: string;
}

export interface ProcessedImageResult {
  buffer: Buffer;
  metadata: {
    width: number;
    height: number;
    format: string;
    size: number;
  };
}

export interface ProcessedImages {
  optimized: ProcessedImageResult;
}

@Injectable()
export class ImageProcessingService {
  private readonly logger = new Logger(ImageProcessingService.name);

  // Single optimal size configuration - perfect for all use cases
  private readonly optimalImageSize = {
    width: 800,
    height: 800, 
    quality: 88,
    description: 'Optimal size for all contexts'
  };

  // Maximum allowed input dimensions (anything larger gets resized)
  private readonly MAX_INPUT_WIDTH = 3000;
  private readonly MAX_INPUT_HEIGHT = 3000;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

  /**
   * Process a single image and generate multiple sizes
   */
    async processImage(imageBuffer: Buffer, filename: string): Promise<ProcessedImages> {
    try {
      // Get image metadata to understand input dimensions
      const metadata = await sharp(imageBuffer).metadata();
      this.logger.log(`Processing image ${filename}: ${metadata.width}x${metadata.height}, ${Math.round(imageBuffer.length / 1024)}KB, format: ${metadata.format}`);
      
      // Pre-process oversized images to reasonable dimensions
      let processedBuffer = imageBuffer;
      if (metadata.width > this.MAX_INPUT_WIDTH || metadata.height > this.MAX_INPUT_HEIGHT) {
        this.logger.log(`Input image is oversized (${metadata.width}x${metadata.height}), pre-processing to manageable size`);
        
        // Calculate intelligent resize maintaining aspect ratio
        const aspectRatio = metadata.width / metadata.height;
        let targetWidth = this.MAX_INPUT_WIDTH;
        let targetHeight = this.MAX_INPUT_HEIGHT;
        
        if (aspectRatio > 1) {
          // Landscape: limit by width
          targetHeight = Math.round(targetWidth / aspectRatio);
        } else {
          // Portrait or square: limit by height
          targetWidth = Math.round(targetHeight * aspectRatio);
        }
        
        processedBuffer = await sharp(imageBuffer)
          .resize(targetWidth, targetHeight, {
            fit: 'inside',
            withoutEnlargement: true,
            kernel: sharp.kernel.lanczos3 // High quality resampling
          })
          .jpeg({ quality: 95, progressive: true, mozjpeg: true })
          .toBuffer();
          
        this.logger.log(`Pre-processed oversized image to ${targetWidth}x${targetHeight}, ${Math.round(processedBuffer.length / 1024)}KB`);
      }
      
      // Process to the single optimal size
      const processedImage = await this.processImageSize(processedBuffer, this.optimalImageSize, filename);
      
      this.logger.log(`Successfully processed ${filename} to optimal size: 800x800`);
      return {
        optimized: processedImage
      };
    } catch (error) {
      this.logger.error(`Error processing image ${filename}:`, error);
      throw new Error(`Image processing failed: ${error.message}`);
    }
  }

  /**
   * Process multiple images in batch
   */
  async processMultipleImages(images: Array<{ buffer: Buffer; filename: string }>): Promise<Array<{ filename: string; processed: ProcessedImages }>> {
    const results = [];

    for (const image of images) {
      try {
        const processed = await this.processImage(image.buffer, image.filename);
        results.push({
          filename: image.filename,
          processed,
        });
      } catch (error) {
        this.logger.error(`Failed to process image ${image.filename}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Process image for a specific size configuration
   */
  private async processImageSize(
    imageBuffer: Buffer,
    config: ImageSizeConfig,
    filename: string,
  ): Promise<ProcessedImageResult> {
    try {
      const inputMetadata = await sharp(imageBuffer).metadata();
      
      // Smart resizing: maintain aspect ratio and avoid upscaling
      let sharpInstance = sharp(imageBuffer);
      
      // Calculate optimal dimensions while maintaining aspect ratio
      let resizeWidth = config.width;
      let resizeHeight = config.height;
      
      // If input is smaller than target, don't upscale
      if (inputMetadata.width <= config.width && inputMetadata.height <= config.height) {
        resizeWidth = inputMetadata.width;
        resizeHeight = inputMetadata.height;
        this.logger.log(`Image ${filename} is smaller than target ${config.description}, keeping original dimensions: ${resizeWidth}x${resizeHeight}`);
      }
      
      // Apply intelligent resizing with high-quality algorithms
      sharpInstance = sharpInstance.resize(resizeWidth, resizeHeight, {
        fit: 'inside', // Maintain aspect ratio, fit within bounds
        withoutEnlargement: true, // Never upscale
        kernel: sharp.kernel.lanczos3, // High quality resampling algorithm
        background: { r: 255, g: 255, b: 255, alpha: 1 } // White background for transparent images
      });
      
      // Apply format-specific optimizations
      let processedBuffer: Buffer;
      if (inputMetadata.format === 'png' && inputMetadata.channels >= 4) {
        // PNG with transparency - keep as PNG but optimize
        processedBuffer = await sharpInstance
          .png({
            quality: config.quality,
            compressionLevel: 9,
            palette: true, // Use palette when possible for smaller file size
          })
          .toBuffer();
      } else {
        // Convert to high-quality JPEG with progressive loading
        processedBuffer = await sharpInstance
          .jpeg({
            quality: config.quality,
            progressive: true, // Enable progressive loading
            mozjpeg: true, // Use mozjpeg for better compression
            optimizeScans: true,
          })
          .toBuffer();
      }

      // Get metadata of processed image
      const processedMetadata = await sharp(processedBuffer).metadata();

      this.logger.log(
        `Processed ${config.description} size for ${filename}: ${processedMetadata.width}x${processedMetadata.height}, ${Math.round(processedBuffer.length / 1024)}KB (${config.quality}% quality)`
      );

      return {
        buffer: processedBuffer,
        metadata: {
          width: processedMetadata.width || config.width,
          height: processedMetadata.height || config.height,
          format: processedMetadata.format || 'jpeg',
          size: processedBuffer.length,
        },
      };
    } catch (error) {
      this.logger.error(`Error processing ${config.description} size for ${filename}:`, error);
      throw error;
    }
  }

  /**
   * Optimize image without resizing (for original size)
   */
  async optimizeImage(imageBuffer: Buffer, quality: number = 90): Promise<ProcessedImageResult> {
    try {
      const sharpInstance = sharp(imageBuffer);
      const metadata = await sharpInstance.metadata();

      // Optimize based on original format or convert to JPEG
      let processedBuffer: Buffer;
      
      if (metadata.format === 'png' && metadata.hasAlpha) {
        // Keep PNG format if it has transparency
        processedBuffer = await sharpInstance
          .png({
            quality,
            progressive: true,
            compressionLevel: 9,
          })
          .toBuffer();
      } else {
        // Convert to optimized JPEG
        processedBuffer = await sharpInstance
          .jpeg({
            quality,
            progressive: true,
            mozjpeg: true,
          })
          .toBuffer();
      }

      const processedMetadata = await sharp(processedBuffer).metadata();

      return {
        buffer: processedBuffer,
        metadata: {
          width: processedMetadata.width || 0,
          height: processedMetadata.height || 0,
          format: processedMetadata.format || 'jpeg',
          size: processedBuffer.length,
        },
      };
    } catch (error) {
      this.logger.error('Error optimizing image:', error);
      throw error;
    }
  }

  /**
   * Enhanced validation that allows large files but provides intelligent feedback
   */
  validateImage(buffer: Buffer, maxSize: number = 10 * 1024 * 1024): Promise<{ valid: boolean; message?: string; warnings?: string[] }> {
    return new Promise(async (resolve, reject) => {
      try {
        const warnings: string[] = [];

        // Check file size with intelligent limits
        if (buffer.length > maxSize) {
          resolve({
            valid: false,
            message: `Image size ${Math.round(buffer.length / 1024 / 1024)}MB exceeds maximum ${Math.round(maxSize / 1024 / 1024)}MB`
          });
          return;
        }

        // Warn about large files that will take time to process
        if (buffer.length > 7 * 1024 * 1024) {
          warnings.push(`Large file size detected (${Math.round(buffer.length / (1024 * 1024))}MB). Processing may take longer but will be optimized automatically.`);
        }

        // Validate image format - be more permissive
        const metadata = await sharp(buffer).metadata();
        const supportedFormats = ['jpeg', 'jpg', 'png', 'webp', 'tiff', 'gif', 'avif'];
        
        if (!metadata.format || !supportedFormats.includes(metadata.format)) {
          resolve({
            valid: false,
            message: `Unsupported image format: ${metadata.format}. Supported formats: ${supportedFormats.join(', ')}`
          });
          return;
        }

        // Check dimensions with intelligent feedback
        if (!metadata.width || !metadata.height) {
          resolve({
            valid: false,
            message: 'Unable to read image dimensions. File may be corrupted.'
          });
          return;
        }

        // Minimum dimensions check but more lenient
        if (metadata.width < 50 || metadata.height < 50) {
          resolve({
            valid: false,
            message: 'Image is too small (minimum 50x50 pixels). Please upload a larger image.'
          });
          return;
        }

        // Warn about very small images
        if (metadata.width < 200 || metadata.height < 200) {
          warnings.push('Image resolution is quite low. Quality may be limited when displayed at larger sizes.');
        }

        // Inform about very large images that will be optimized
        if (metadata.width > this.MAX_INPUT_WIDTH || metadata.height > this.MAX_INPUT_HEIGHT) {
          warnings.push(`Very high resolution detected (${metadata.width}x${metadata.height}). Image will be intelligently resized to optimal dimensions while maintaining quality.`);
        }

        resolve({
          valid: true,
          warnings: warnings.length > 0 ? warnings : undefined
        });
      } catch (error) {
        resolve({
          valid: false,
          message: 'Invalid image file or corrupted data.'
        });
      }
    });
  }

  /**
   * Get optimal image size configuration
   */
  getImageSizeInfo(): ImageSizeConfig {
    return { ...this.optimalImageSize };
  }
}

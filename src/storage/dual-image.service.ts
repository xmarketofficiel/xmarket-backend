import { Injectable, Logger } from '@nestjs/common';
import { SpacesService, PresignedUrlResponse, BufferUploadResult } from './spaces.service';
import { v2 as cloudinary } from 'cloudinary';
import * as sharp from 'sharp';

export interface ImageVariant {
  name: string;
  width: number;
  height?: number;
  quality: number;
}

export interface ResizedImageResult {
  variant: string;
  buffer: Buffer;
  size: number;
  spacesKey: string;
  spacesUrl: string;
}

export interface ImageUploadResult {
  cloudinaryUrl?: string;
  spacesUrl?: string;
  spacesVariants?: ResizedImageResult[];
  publicId?: string;
  spacesKey?: string;
  success: boolean;
  errors?: string[];
}

export interface DualUploadResponse {
  primary: ImageUploadResult;
  backup: ImageUploadResult;
  recommendedUrl: string;
  fallbackUrl?: string;
  variants?: { [key: string]: string };
}

export interface PresignedUploadUrls {
  cloudinary?: {
    uploadUrl: string;
    publicId: string;
  };
  spaces?: {
    presignedUrl: string;
    publicUrl: string;
    key: string;
  };
}

@Injectable()
export class DualImageService {
  private readonly logger = new Logger(DualImageService.name);

  // Define image variants for different use cases
  private readonly imageVariants: ImageVariant[] = [
    { name: 'thumbnail', width: 150, height: 150, quality: 80 },
    { name: 'small', width: 300, height: 300, quality: 85 },
    { name: 'medium', width: 600, height: 600, quality: 90 },
    { name: 'large', width: 1200, height: 1200, quality: 92 },
  ];

  constructor(private readonly spacesService: SpacesService) {
    // Cloudinary configuration (already configured in your app)
    if (!cloudinary.config().cloud_name) {
      this.logger.warn('Cloudinary not configured properly');
    }
    
    // Log DualImageService initialization
    this.logger.log('🚀 DualImageService initialized');
    this.logger.log(`📋 Spaces configured: ${this.spacesService.isConfigured()}`);
    if (this.spacesService.isConfigured()) {
      this.logger.log(`📋 Spaces config: ${JSON.stringify(this.spacesService.getConfigStatus())}`);
    }
  }

  /**
   * Upload and resize image to both Cloudinary and DO Spaces
   */
  async uploadImageToBothServices(
    imageBuffer: Buffer,
    userId: number,
    category: 'avatar' | 'item' | 'service',
    filename: string,
    itemId?: number
  ): Promise<DualUploadResponse> {
    const response: DualUploadResponse = {
      primary: { success: false, errors: [] },
      backup: { success: false, errors: [] },
      recommendedUrl: '',
      variants: {}
    };

    this.logger.log(`🚀 Starting dual upload for user ${userId}, category: ${category}, filename: ${filename}`);

    try {
      // Upload original to Cloudinary (with their built-in transformations)
      this.logger.log('📤 Starting Cloudinary upload...');
      const cloudinaryResult = await this.uploadToCloudinary(
        imageBuffer,
        userId,
        category,
        filename,
        itemId
      );
      response.primary = cloudinaryResult;
      this.logger.log(`✅ Cloudinary upload result: ${cloudinaryResult.success ? 'SUCCESS' : 'FAILED'}`);

      // Resize and upload multiple variants to DO Spaces
      this.logger.log('📤 Starting DigitalOcean Spaces upload...');
      const spacesResult = await this.resizeAndUploadToSpaces(
        imageBuffer,
        userId,
        category,
        filename,
        itemId
      );
      response.backup = spacesResult;
      this.logger.log(`✅ Spaces upload result: ${spacesResult.success ? 'SUCCESS' : 'FAILED'}`);

      // Set recommended URLs
      response.recommendedUrl = cloudinaryResult.cloudinaryUrl || spacesResult.spacesUrl || '';
      response.fallbackUrl = spacesResult.spacesUrl;

      // Create variant URLs mapping
      if (spacesResult.spacesVariants) {
        spacesResult.spacesVariants.forEach(variant => {
          response.variants![variant.variant] = variant.spacesUrl;
        });
      }

      this.logger.log(`🎯 Final result - Primary: ${response.primary.success}, Backup: ${response.backup.success}, URL: ${response.recommendedUrl}`);

    } catch (error) {
      this.logger.error(`❌ Dual upload failed: ${error.message}`);
      response.primary.errors?.push(error.message);
      response.backup.errors?.push(error.message);
    }

    return response;
  }

  /**
   * Resize image to multiple variants and upload to DO Spaces
   */
  private async resizeAndUploadToSpaces(
    imageBuffer: Buffer,
    userId: number,
    category: string,
    filename: string,
    itemId?: number
  ): Promise<ImageUploadResult> {
    const result: ImageUploadResult = { 
      success: false, 
      spacesVariants: [],
      errors: [] 
    };

    this.logger.log(`🔄 Starting Spaces upload for user ${userId}, category: ${category}`);

    // Check if Spaces is configured
    if (!this.spacesService.isConfigured()) {
      this.logger.error('❌ DigitalOcean Spaces is not properly configured');
      result.errors?.push('DigitalOcean Spaces not configured');
      return result;
    }

    this.logger.log(`✅ Spaces configuration verified`);

    try {
      // Process each variant
      const resizePromises = this.imageVariants.map(async (variant) => {
        try {
          // Resize image using Sharp
          const resizedBuffer = await sharp(imageBuffer)
            .resize(variant.width, variant.height, {
              fit: 'cover', // Crop to fill dimensions
              position: 'center'
            })
            .jpeg({ quality: variant.quality }) // Convert to JPEG with compression
            .toBuffer();

          // Generate unique key for this variant
          const spacesKey = this.generateSpacesKeyWithVariant(
            userId, 
            category, 
            filename, 
            variant.name,
            itemId
          );

          // Upload to DO Spaces
          const uploadResult = await this.spacesService.uploadBuffer(
            resizedBuffer,
            spacesKey,
            'image/jpeg'
          );

          return {
            variant: variant.name,
            buffer: resizedBuffer,
            size: resizedBuffer.length,
            spacesKey,
            spacesUrl: uploadResult.publicUrl
          } as ResizedImageResult;

        } catch (error) {
          this.logger.warn(`Failed to resize variant ${variant.name}: ${error.message}`);
          return null;
        }
      });

      // Wait for all variants to complete
      const resizedResults = await Promise.allSettled(resizePromises);
      
      // Collect successful uploads
      result.spacesVariants = resizedResults
        .filter(r => r.status === 'fulfilled' && r.value !== null)
        .map(r => (r as PromiseFulfilledResult<ResizedImageResult>).value);

      // Use medium variant as primary URL
      const primaryVariant = result.spacesVariants.find(v => v.variant === 'medium') 
                           || result.spacesVariants[0];
      
      if (primaryVariant) {
        result.spacesUrl = primaryVariant.spacesUrl;
        result.spacesKey = primaryVariant.spacesKey;
        result.success = true;

        // Calculate total space saved
        const originalSize = imageBuffer.length;
        const totalResizedSize = result.spacesVariants.reduce((sum, v) => sum + v.size, 0);
        const spaceSaved = originalSize - (totalResizedSize / result.spacesVariants.length);
        
        this.logger.log(`Space optimization: Original ${this.formatBytes(originalSize)} → Avg variant ${this.formatBytes(totalResizedSize / result.spacesVariants.length)} (${Math.round((spaceSaved / originalSize) * 100)}% saved)`);
      }

    } catch (error) {
      this.logger.error(`Spaces upload failed: ${error.message}`);
      result.errors?.push(error.message);
    }

    return result;
  }

  /**
   * Upload original image to Cloudinary
   */
  private async uploadToCloudinary(
    imageBuffer: Buffer,
    userId: number,
    category: string,
    filename: string,
    itemId?: number
  ): Promise<ImageUploadResult> {
    const result: ImageUploadResult = { success: false, errors: [] };

    try {
      const publicId = this.generateCloudinaryPublicId(userId, category, filename, itemId);
      
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            public_id: publicId,
            folder: 'xmarket',
            transformation: [
              { quality: 'auto', fetch_format: 'auto' }, // Auto optimization
              { width: 1200, height: 1200, crop: 'limit' } // Limit max size
            ]
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(imageBuffer);
      });

      result.cloudinaryUrl = (uploadResult as any).secure_url;
      result.publicId = (uploadResult as any).public_id;
      result.success = true;

    } catch (error) {
      this.logger.error(`Cloudinary upload failed: ${error.message}`);
      result.errors?.push(error.message);
    }

    return result;
  }

  /**
   * Get the best image URL for a specific size
   */
  async getBestImageUrlForSize(
    size: 'thumbnail' | 'small' | 'medium' | 'large',
    cloudinaryUrl?: string,
    spacesVariants?: ResizedImageResult[]
  ): Promise<string | null> {
    // Try Cloudinary with size transformation first
    if (cloudinaryUrl) {
      const sizeTransformations = {
        thumbnail: 'w_150,h_150,c_fill',
        small: 'w_300,h_300,c_fill',
        medium: 'w_600,h_600,c_fill',
        large: 'w_1200,h_1200,c_fill'
      };
      
      const transformedUrl = cloudinaryUrl.replace(
        '/upload/',
        `/upload/${sizeTransformations[size]}/`
      );
      
      if (await this.isUrlAccessible(transformedUrl)) {
        return transformedUrl;
      }
    }

    // Fallback to DO Spaces variant
    if (spacesVariants) {
      const variant = spacesVariants.find(v => v.variant === size);
      if (variant && await this.isUrlAccessible(variant.spacesUrl)) {
        return variant.spacesUrl;
      }
    }

    return null;
  }

  /**
   * Generate Cloudinary public ID with organized structure
   */
  private generateCloudinaryPublicId(
    userId: number,
    category: string,
    filename: string,
    itemId?: number
  ): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9]/g, '_');
    
    if (category === 'item' && itemId) {
      return `xmarket/users/${userId}/items/${itemId}/${timestamp}_${sanitizedFilename}`;
    } else {
      return `xmarket/users/${userId}/${category}/${timestamp}_${sanitizedFilename}`;
    }
  }

  /**
   * Generate Spaces key with variant suffix using the organized folder structure
   */
  private generateSpacesKeyWithVariant(
    userId: number,
    category: string,
    filename: string,
    variant: string,
    itemId?: number
  ): string {
    this.logger.debug(`🔍 Generating Spaces key: userId=${userId}, category=${category}, variant=${variant}, itemId=${itemId}, filename=${filename}`);
    
    // Use the correct generateSecurePath method directly with the category and variant
    const path = this.spacesService.generateSecurePath(
      userId,
      category as 'avatar' | 'item' | 'service',
      filename,
      itemId,
      variant
    );
    
    this.logger.debug(`🔍 Generated Spaces path: ${path}`);
    return path;
  }

  /**
   * Generate Spaces key with organized structure (/items and /profile folders)
   */
  private generateSpacesKey(
    userId: number,
    category: string,
    filename: string,
    itemId?: number
  ): string {
    // Use the SpacesService method to generate the proper path
    return this.spacesService.generateSecurePath(
      userId,
      category as 'avatar' | 'item' | 'service',
      filename,
      itemId
    );
  }  /**
   * Format bytes for logging
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Generate presigned URLs for dual upload (both Cloudinary and Spaces)
   */
  async generateDualUploadUrls(
    userId: number,
    category: 'avatar' | 'item' | 'service',
    filename: string,
    contentType: string,
    itemId?: number
  ): Promise<PresignedUploadUrls> {
    const result: PresignedUploadUrls = {};

    try {
      // Generate Cloudinary upload URL
      const publicId = this.generateCloudinaryPublicId(userId, category, filename, itemId);
      const cloudinaryUploadUrl = this.generateCloudinaryUploadUrl(publicId);
      
      result.cloudinary = {
        uploadUrl: cloudinaryUploadUrl,
        publicId,
      };
    } catch (error) {
      this.logger.warn(`Failed to generate Cloudinary URL: ${error.message}`);
    }

    try {
      // Generate Spaces presigned URL
      if (this.spacesService.isConfigured()) {
        const spacesKey = this.generateSpacesKey(userId, category, filename, itemId);
        const spacesResult = await this.spacesService.generatePresignedUrl(
          spacesKey,
          contentType
        );
        
        result.spaces = spacesResult;
      }
    } catch (error) {
      this.logger.warn(`Failed to generate Spaces URL: ${error.message}`);
    }

    return result;
  }

  /**
   * Generate multiple presigned URLs for batch upload
   */
  async generateBatchUploadUrls(
    userId: number,
    itemId: number,
    filenames: string[],
    contentType: string = 'image/jpeg'
  ): Promise<PresignedUploadUrls[]> {
    const promises = filenames.map(filename =>
      this.generateDualUploadUrls(userId, 'item', filename, contentType, itemId)
    );
    return Promise.all(promises);
  }

  /**
   * Get the best available image URL (Cloudinary first, then Spaces)
   */
  async getBestImageUrl(cloudinaryUrl?: string, spacesUrl?: string): Promise<string | null> {
    // Try Cloudinary first
    if (cloudinaryUrl && await this.isUrlAccessible(cloudinaryUrl)) {
      return cloudinaryUrl;
    }

    // Fallback to Spaces
    if (spacesUrl && await this.isUrlAccessible(spacesUrl)) {
      return spacesUrl;
    }

    return null;
  }

  /**
   * Get multiple image URLs with fallback logic
   */
  async getBestImageUrls(images: Array<{ cloudinaryUrl?: string; spacesUrl?: string }>): Promise<string[]> {
    const promises = images.map(image => 
      this.getBestImageUrl(image.cloudinaryUrl, image.spacesUrl)
    );
    const results = await Promise.all(promises);
    return results.filter(url => url !== null);
  }

  /**
   * Delete images from both services including variants
   */
  async deleteFromBothServices(publicId?: string, spacesKey?: string): Promise<void> {
    const deletePromises: Promise<any>[] = [];

    // Delete from Cloudinary
    if (publicId) {
      deletePromises.push(
        cloudinary.uploader.destroy(publicId).catch(error => {
          this.logger.warn(`Failed to delete from Cloudinary (${publicId}): ${error.message}`);
        })
      );
    }

    // Delete variants from Spaces
    if (spacesKey) {
      this.imageVariants.forEach(variant => {
        const variantKey = spacesKey.replace(/\.[^/.]+$/, `_${variant.name}.jpg`);
        deletePromises.push(
          this.spacesService.deleteObject(variantKey).catch(error => {
            this.logger.warn(`Failed to delete variant ${variant.name} from Spaces: ${error.message}`);
          })
        );
      });
    }

    await Promise.allSettled(deletePromises);
  }

  /**
   * Generate Cloudinary upload URL (this is a simplified version)
   * In practice, you might want to use Cloudinary's upload API directly
   */
  private generateCloudinaryUploadUrl(publicId: string): string {
    // This is a placeholder - in reality, you'd generate a signed upload URL
    // using Cloudinary's API. For now, return the API endpoint.
    const cloudName = cloudinary.config().cloud_name;
    return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  }

  /**
   * Check if a URL is accessible (simplified version)
   */
  private async isUrlAccessible(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get image metadata and validation
   */
  validateImageFile(filename: string, size: number, maxSize: number = 5 * 1024 * 1024): boolean {
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    
    return allowedExtensions.includes(extension) && size <= maxSize;
  }
}

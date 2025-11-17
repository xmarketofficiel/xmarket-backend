import { Injectable, Logger } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createHash } from 'crypto';

export interface PresignedUrlResponse {
  presignedUrl: string;
  publicUrl: string;
  key: string;
}

export interface BufferUploadResult {
  publicUrl: string;
  key: string;
  size: number;
}

@Injectable()
export class SpacesService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly logger = new Logger(SpacesService.name);

  constructor() {
    this.s3Client = new S3Client({
      endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
      region: process.env.DO_SPACES_REGION,
      credentials: {
        accessKeyId: process.env.DO_SPACES_KEY,
        secretAccessKey: process.env.DO_SPACES_SECRET,
      },
      forcePathStyle: false,
    });

    this.bucketName = process.env.DO_SPACES_BUCKET;

    // Validate required environment variables
    if (!process.env.DO_SPACES_KEY || !process.env.DO_SPACES_SECRET || !process.env.DO_SPACES_BUCKET || !process.env.DO_SPACES_REGION) {
      throw new Error('Missing required DigitalOcean Spaces environment variables');
    }
  }

  /**
   * Get public URL for an image stored in DigitalOcean Spaces
   * Uses CDN domain if configured, otherwise uses direct Spaces URL
   */
  getPublicUrl(key: string): string {
    const cdnDomain = process.env.DO_SPACES_CDN_DOMAIN;
    
    if (cdnDomain) {
      return `https://${cdnDomain}/${key}`;
    }
    
    return `https://${this.bucketName}.${process.env.DO_SPACES_REGION}.digitaloceanspaces.com/${key}`;
  }

  /**
   * Upload buffer directly to DigitalOcean Spaces
   */
  async uploadBuffer(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<BufferUploadResult> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: 'public-read',
      });

      await this.s3Client.send(command);

      const publicUrl = this.getPublicUrl(key);
      
      this.logger.debug(`Uploaded buffer to Spaces: ${key} (${buffer.length} bytes)`);

      return {
        publicUrl,
        key,
        size: buffer.length
      };
    } catch (error) {
      this.logger.error(`Failed to upload buffer to Spaces: ${error.message}`);
      throw new Error(`Failed to upload to Spaces: ${error.message}`);
    }
  }

  /**
   * Delete object from DigitalOcean Spaces
   */
  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.debug(`Deleted object from Spaces: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete object from Spaces: ${error.message}`);
      throw new Error(`Failed to delete from Spaces: ${error.message}`);
    }
  }

  /**
   * Generate presigned URL for uploading a single file to DigitalOcean Spaces
   */
  async generatePresignedUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<PresignedUrlResponse> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
        ACL: 'public-read', // Make uploaded files publicly accessible
      });

      const presignedUrl = await getSignedUrl(this.s3Client, command, { expiresIn });
      const publicUrl = this.getPublicUrl(key);

      this.logger.debug(`Generated presigned URL for key: ${key}`);

      return {
        presignedUrl,
        publicUrl,
        key,
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL for key: ${key}`, error);
      throw new Error(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  /**
   * Generate multiple presigned URLs for batch upload
   */
  async generateBatchPresignedUrls(
    keys: string[],
    contentTypes: string[],
    expiresIn: number = 3600
  ): Promise<PresignedUrlResponse[]> {
    if (keys.length !== contentTypes.length) {
      throw new Error('Keys and content types arrays must have the same length');
    }

    const promises = keys.map((key, index) =>
      this.generatePresignedUrl(key, contentTypes[index], expiresIn)
    );

    try {
      const results = await Promise.all(promises);
      this.logger.debug(`Generated ${results.length} presigned URLs for batch upload`);
      return results;
    } catch (error) {
      this.logger.error('Failed to generate batch presigned URLs', error);
      throw new Error(`Failed to generate batch presigned URLs: ${error.message}`);
    }
  }

  /**
   * Generate a secure file path for storage organized by bucket folders
   * Uses hashed UUIDs to prevent enumeration attacks
   * Follows the bucket structure: /items and /profile
   */
  generateSecurePath(userId: number, category: 'avatar' | 'item' | 'service', filename: string, itemId?: number, variant?: string): string {
    this.logger.debug(`🔍 SpacesService.generateSecurePath called: userId=${userId}, category=${category}, filename=${filename}, itemId=${itemId}, variant=${variant}`);
    
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = filename.split('.').pop();
    
    // Generate secure hashed folder names instead of using raw IDs
    const userHash = this.generateSecureHash(userId);
    const itemHash = itemId ? this.generateSecureHash(itemId) : null;
    
    let basePath = '';
    
    switch (category) {
      case 'avatar':
        // Profile images go in the /profile folder with hashed user ID
        if (variant) {
          basePath = `profile/${userHash}/${variant}`;
        } else {
          basePath = `profile/${userHash}`;
        }
        break;
      case 'item':
        // Item images go in the /items folder with hashed item ID
        if (variant) {
          // For optimized variants: /items/[hashedItemId]/[variant]/filename
          basePath = itemHash ? `items/${itemHash}/${variant}` : `items/${userHash}/${variant}`;
        } else {
          // For original images: /items/[hashedItemId]/filename
          basePath = itemHash ? `items/${itemHash}` : `items/${userHash}`;
        }
        break;
      case 'service':
        // Services also go in items folder for now
        basePath = `items/services/${userHash}`;
        break;
      default:
        basePath = `items/misc/${userHash}`;
    }

    const finalPath = `${basePath}/${timestamp}-${randomString}.${fileExtension}`;
    this.logger.debug(`🔍 Final generated path: ${finalPath}`);
    return finalPath;
  }

  /**
   * Generate a secure hash from an ID to prevent enumeration
   * Uses SHA-256 with a secret salt for security
   */
  private generateSecureHash(id: number): string {
    // Use a secret from environment or a default salt
    const secret = process.env.FILE_PATH_SECRET || 'xmarket-default-secret-change-in-production';
    const hash = createHash('sha256')
      .update(`${secret}-${id}`)
      .digest('hex');
    // Return first 16 characters for shorter paths while maintaining security
    return hash.substring(0, 16);
  }

  /**
   * Generate organized path for image variants (thumbnail, small, medium, large)
   */
  generateVariantPath(userId: number, itemId: number, variant: 'thumbnail' | 'small' | 'medium' | 'large', filename: string): string {
    return this.generateSecurePath(userId, 'item', filename, itemId, variant);
  }

  /**
   * Check if DigitalOcean Spaces is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.DO_SPACES_KEY &&
      process.env.DO_SPACES_SECRET &&
      process.env.DO_SPACES_BUCKET &&
      process.env.DO_SPACES_REGION
    );
  }

  /**
   * Get configuration status for debugging
   */
  getConfigStatus() {
    return {
      isConfigured: this.isConfigured(),
      bucket: this.bucketName,
      region: process.env.DO_SPACES_REGION,
      cdnConfigured: !!process.env.DO_SPACES_CDN_DOMAIN,
      endpoint: `https://${process.env.DO_SPACES_REGION}.digitaloceanspaces.com`,
    };
  }
}

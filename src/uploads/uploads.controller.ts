import { 
  Controller, 
  Post, 
  Get, 
  Query, 
  Body, 
  UseGuards,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  Req 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { DualImageService } from '../storage/dual-image.service';
import { SpacesService } from '../storage/spaces.service';
import { Logger } from '@nestjs/common';

interface OptimizedUploadDto {
  category: 'avatar' | 'item' | 'service';
  itemId?: number;
}

interface GenerateUrlsDto {
  filename: string;
  contentType: string;
  category: 'avatar' | 'item' | 'service';
  itemId?: number;
}

interface BatchUrlsDto {
  filenames: string[];
  contentType: string;
  itemId: number;
}

@ApiTags('uploads')
@Controller('uploads')
export class UploadsController {
  private readonly logger = new Logger(UploadsController.name);

  constructor(
    private readonly dualImageService: DualImageService,
    private readonly spacesService: SpacesService,
  ) {}

  @Post('generate-presigned-url')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate presigned URL for direct upload to DigitalOcean Spaces',
    description: 'Returns a presigned URL for direct client-side upload to organized folders (/items or /profile)'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Presigned URL generated successfully',
    schema: {
      example: {
        presignedUrl: 'https://nyc3.digitaloceanspaces.com/xmarket-app-dev/items/a1b2c3d4e5f6g7h8/1634567890-abc123.jpg?X-Amz-Signature=...',
        publicUrl: 'https://xmarket-app-dev.nyc3.digitaloceanspaces.com/items/a1b2c3d4e5f6g7h8/1634567890-abc123.jpg',
        key: 'items/a1b2c3d4e5f6g7h8/1634567890-abc123.jpg',
        expiresIn: 3600,
        uploadInstructions: {
          method: 'PUT',
          headers: {
            'Content-Type': 'image/jpeg'
          }
        }
      }
    }
  })
  async generatePresignedUrl(
    @CurrentUser() user: User,
    @Body() generateUrlsDto: GenerateUrlsDto,
  ) {
    const { filename, contentType, category, itemId } = generateUrlsDto;

    // Validate file type
    if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      throw new BadRequestException('Invalid image file type. Only JPG, PNG, GIF, and WebP are allowed');
    }

    try {
      // Generate a secure path using the organized folder structure
      const key = this.spacesService.generateSecurePath(
        user.id,
        category,
        filename,
        itemId
      );

      const presignedResult = await this.spacesService.generatePresignedUrl(
        key,
        contentType,
        3600 // 1 hour expiry
      );

      return {
        success: true,
        message: 'Presigned URL generated successfully',
        ...presignedResult,
        expiresIn: 3600,
        uploadInstructions: {
          method: 'PUT',
          headers: {
            'Content-Type': contentType
          },
          note: 'Upload file directly to presignedUrl using PUT method'
        },
        organization: {
          folder: category === 'avatar' ? 'profile' : 'items',
          structure: category === 'avatar' ? `/profile/${user.id}/` : `/items/${itemId || `user-${user.id}`}/`
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`);
      throw new BadRequestException(`Failed to generate presigned URL: ${error.message}`);
    }
  }

  @Post('generate-batch-presigned-urls')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate multiple presigned URLs for batch upload',
    description: 'Generate multiple presigned URLs for uploading several images to organized folders'
  })
  @ApiResponse({ status: 201, description: 'Batch presigned URLs generated successfully' })
  async generateBatchPresignedUrls(
    @CurrentUser() user: User,
    @Body() batchUrlsDto: BatchUrlsDto,
  ) {
    const { filenames, contentType, itemId } = batchUrlsDto;

    // Validate files
    for (const filename of filenames) {
      if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        throw new BadRequestException(`Invalid file type: ${filename}. Only JPG, PNG, GIF, and WebP are allowed`);
      }
    }

    if (filenames.length > 6) {
      throw new BadRequestException('Maximum 6 images allowed per batch');
    }

    try {
      // Generate secure paths for all files
      const keys = filenames.map(filename => 
        this.spacesService.generateSecurePath(user.id, 'item', filename, itemId)
      );

      const contentTypes = filenames.map(() => contentType);

      const presignedUrls = await this.spacesService.generateBatchPresignedUrls(
        keys,
        contentTypes,
        3600 // 1 hour expiry
      );

      return {
        success: true,
        message: 'Batch presigned URLs generated successfully',
        count: filenames.length,
        urls: presignedUrls,
        expiresIn: 3600,
        uploadInstructions: {
          method: 'PUT',
          note: 'Upload each file to its corresponding presignedUrl using PUT method',
          order: 'Files are returned in the same order as requested'
        },
        organization: {
          folder: 'items',
          structure: `/items/${itemId}/`
        }
      };
    } catch (error) {
      this.logger.error(`Failed to generate batch presigned URLs: ${error.message}`);
      throw new BadRequestException(`Failed to generate batch presigned URLs: ${error.message}`);
    }
  }

  @Post('generate-upload-urls')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate presigned URLs for dual upload (Cloudinary + DigitalOcean Spaces)',
    description: 'Returns upload URLs for both Cloudinary and DigitalOcean Spaces. Client should upload to both for redundancy.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Upload URLs generated successfully',
    schema: {
      example: {
        cloudinary: {
          uploadUrl: 'https://api.cloudinary.com/v1_1/your-cloud/image/upload',
          publicId: 'xmarket/users/123/items/456/1634567890_image'
        },
        spaces: {
          presignedUrl: 'https://nyc3.digitaloceanspaces.com/xmarket-uploads/users/123/items/456/1_1634567890_image.jpg?X-Amz-Signature=...',
          publicUrl: 'https://xmarket-uploads.nyc3.digitaloceanspaces.com/users/123/items/456/1_1634567890_image.jpg',
          key: 'users/123/items/456/1_1634567890_image.jpg'
        }
      }
    }
  })
  async generateUploadUrls(
    @CurrentUser() user: User,
    @Body() generateUrlsDto: GenerateUrlsDto,
  ) {
    const { filename, contentType, category, itemId } = generateUrlsDto;

    // Validate file (we'll set a default size for filename validation)
    // Note: Actual size validation happens during upload on the client side
    if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      throw new BadRequestException('Invalid image file type. Only JPG, PNG, GIF, and WebP are allowed');
    }

    try {
      const urls = await this.dualImageService.generateDualUploadUrls(
        user.id,
        category,
        filename,
        contentType,
        itemId,
      );

      return {
        success: true,
        message: 'Upload URLs generated successfully',
        urls,
        instructions: {
          upload: 'Upload your file to both URLs for redundancy',
          primary: 'Cloudinary (preferred for display)',
          backup: 'DigitalOcean Spaces (backup storage)',
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate upload URLs: ${error.message}`);
    }
  }

  @Post('generate-batch-urls')
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Generate presigned URLs for batch upload (multiple images)',
    description: 'Generate upload URLs for multiple images (e.g., for item galleries)'
  })
  @ApiResponse({ status: 201, description: 'Batch upload URLs generated successfully' })
  async generateBatchUploadUrls(
    @CurrentUser() user: User,
    @Body() batchUrlsDto: BatchUrlsDto,
  ) {
    const { filenames, contentType, itemId } = batchUrlsDto;

    // Validate files
    for (const filename of filenames) {
      if (!filename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        throw new BadRequestException(`Invalid file type: ${filename}. Only JPG, PNG, GIF, and WebP are allowed`);
      }
    }

    if (filenames.length > 6) {
      throw new BadRequestException('Maximum 6 images allowed per batch');
    }

    try {
      const batchUrls = await this.dualImageService.generateBatchUploadUrls(
        user.id,
        itemId,
        filenames,
        contentType,
      );

      return {
        success: true,
        message: 'Batch upload URLs generated successfully',
        count: filenames.length,
        urls: batchUrls,
        instructions: {
          upload: 'Upload each file to both its Cloudinary and Spaces URLs',
          order: 'Maintain the order for proper image sequencing',
        },
      };
    } catch (error) {
      throw new BadRequestException(`Failed to generate batch URLs: ${error.message}`);
    }
  }

  @Get('image-url')
  @ApiOperation({ 
    summary: 'Get best available image URL with fallback',
    description: 'Returns the best available URL (Cloudinary first, then Spaces fallback)'
  })
  @ApiResponse({ status: 200, description: 'Image URL retrieved successfully' })
  async getBestImageUrl(
    @Query('cloudinaryUrl') cloudinaryUrl?: string,
    @Query('spacesUrl') spacesUrl?: string,
  ) {
    if (!cloudinaryUrl && !spacesUrl) {
      throw new BadRequestException('At least one URL must be provided');
    }

    try {
      const bestUrl = await this.dualImageService.getBestImageUrl(cloudinaryUrl, spacesUrl);
      
      return {
        success: true,
        url: bestUrl,
        source: bestUrl === cloudinaryUrl ? 'cloudinary' : 'spaces',
        fallbackAvailable: !!(cloudinaryUrl && spacesUrl && bestUrl),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to resolve image URL: ${error.message}`);
    }
  }

  @Post('upload-optimized')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload original image to both Cloudinary and DigitalOcean Spaces',
    description: 'Uploads original image to both services for redundancy (no variants)'
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Image uploaded successfully' })
  @ApiResponse({ status: 400, description: 'Invalid file or upload parameters' })
  async uploadOptimizedImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: OptimizedUploadDto,
    @CurrentUser() user: User
  ) {
    try {
      // Validate file
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      if (!this.dualImageService.validateImageFile(file.originalname, file.size)) {
        throw new BadRequestException('Invalid image file type or size');
      }

      // Upload original to both services
      const result = await this.dualImageService.uploadImageToBothServices(
        file.buffer,
        user.id,
        body.category,
        file.originalname,
        body.itemId
      );

      return {
        success: true,
        message: 'Image uploaded successfully to both services',
        urls: {
          primary: result.recommendedUrl, // DO Spaces URL (primary)
          fallback: result.fallbackUrl
        },
        spaces: {
          success: result.primary.success,
          url: result.primary.spacesUrl,
          key: result.primary.spacesKey
        },
        cloudinary: {
          success: result.backup.success,
          url: result.backup.cloudinaryUrl,
          publicId: result.backup.publicId
        },
        storage: {
          originalSize: file.size,
          uploaded: 'Original image only (no variants)',
          primaryStorage: 'DigitalOcean Spaces',
          backupStorage: 'Cloudinary (async)'
        }
      };

    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  @Get('best-image-url-size')
  @ApiOperation({ 
    summary: 'Get best image URL for a specific size',
    description: 'Returns the best available URL (Cloudinary or Spaces) for a specific image size'
  })
  @ApiResponse({ status: 200, description: 'Best image URL retrieved successfully' })
  async getBestImageUrlForSize(
    @Query('size') size: 'thumbnail' | 'small' | 'medium' | 'large',
    @Query('cloudinaryUrl') cloudinaryUrl?: string,
    @Query('spacesVariants') spacesVariantsJson?: string
  ) {
    try {
      let spacesVariants;
      if (spacesVariantsJson) {
        spacesVariants = JSON.parse(spacesVariantsJson);
      }

      const bestUrl = await this.dualImageService.getBestImageUrlForSize(
        size,
        cloudinaryUrl,
        spacesVariants
      );

      return {
        success: true,
        imageUrl: bestUrl,
        size: size,
        provider: bestUrl?.includes('cloudinary') ? 'cloudinary' : 'spaces'
      };
    } catch (error) {
      this.logger.error(`Failed to get best image URL: ${error.message}`);
      throw new BadRequestException(`Failed to get image URL: ${error.message}`);
    }
  }

  @Get('spaces-status')
  @ApiOperation({ 
    summary: 'Check DigitalOcean Spaces configuration status',
    description: 'Returns whether Spaces is properly configured and available'
  })
  @ApiResponse({ status: 200, description: 'Spaces status retrieved successfully' })
  getSpacesStatus() {
    return {
      configured: this.spacesService.isConfigured(),
      bucket: process.env.DO_SPACES_BUCKET || 'Not configured',
      region: process.env.DO_SPACES_REGION || 'Not configured',
      cdnEnabled: !!process.env.DO_SPACES_CDN_DOMAIN,
    };
  }

  @Get('upload-info')
  @ApiOperation({ 
    summary: 'Get upload configuration and limits',
    description: 'Returns information about upload limits and supported formats'
  })
  @ApiResponse({ status: 200, description: 'Upload info retrieved successfully' })
  getUploadInfo() {
    return {
      maxFileSize: '7MB',
      maxFilesPerBatch: 6,
      supportedFormats: ['.jpg', '.jpeg', '.png', '.webp'],
      uploadMethods: {
        single: 'POST /uploads/generate-upload-urls',
        batch: 'POST /uploads/generate-batch-urls',
      },
      storageProviders: {
        primary: 'Cloudinary (for fast CDN delivery)',
        backup: 'DigitalOcean Spaces (for redundancy)',
      },
    };
  }
}
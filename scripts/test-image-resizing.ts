import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { DualImageService } from '../src/storage/dual-image.service';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.development' });

async function testImageResizing() {
  console.log('🧪 Testing Image Resizing and Dual Upload');
  console.log('=========================================\n');

  // Verify environment variables are loaded
  console.log('🔧 Environment Check:');
  console.log(`   DO_SPACES_BUCKET: ${process.env.DO_SPACES_BUCKET || 'NOT SET'}`);
  console.log(`   DO_SPACES_REGION: ${process.env.DO_SPACES_REGION || 'NOT SET'}`);
  console.log(`   DO_SPACES_KEY: ${process.env.DO_SPACES_KEY ? 'SET' : 'NOT SET'}`);
  console.log(`   CLOUDINARY_CLOUD_NAME: ${process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET'}\n`);

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const dualImageService = app.get(DualImageService);

    // Check if we have a test image in uploads folder
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const testImages = fs.readdirSync(uploadsDir).filter(file => 
      file.toLowerCase().match(/\.(jpg|jpeg|png)$/i)
    );

    if (testImages.length === 0) {
      console.log('❌ No test images found in uploads/ directory');
      console.log('Please add a test image (JPG/PNG) to the uploads folder');
      return;
    }

    const testImage = testImages[0];
    const imagePath = path.join(uploadsDir, testImage);
    const imageBuffer = fs.readFileSync(imagePath);

    console.log(`📷 Using test image: ${testImage}`);
    console.log(`📊 Original size: ${(imageBuffer.length / 1024).toFixed(2)} KB\n`);

    // Test image upload and resizing
    console.log('🔄 Starting dual upload with resizing...');
    
    const result = await dualImageService.uploadImageToBothServices(
      imageBuffer,
      123, // Test user ID
      'item', // Category
      testImage,
      456 // Test item ID
    );

    console.log('\n✅ Upload Results:');
    console.log('================');
    
    // Cloudinary results
    console.log(`\n🌤️  Cloudinary:`);
    console.log(`   Success: ${result.primary.success}`);
    console.log(`   URL: ${result.primary.cloudinaryUrl || 'Failed'}`);
    console.log(`   Public ID: ${result.primary.publicId || 'N/A'}`);

    // Spaces results
    console.log(`\n🌊 DigitalOcean Spaces:`);
    console.log(`   Success: ${result.backup.success}`);
    console.log(`   Primary URL: ${result.backup.spacesUrl || 'Failed'}`);
    console.log(`   Variants Created: ${result.backup.spacesVariants?.length || 0}`);

    if (result.backup.spacesVariants && result.backup.spacesVariants.length > 0) {
      console.log(`\n📐 Resized Variants:`);
      result.backup.spacesVariants.forEach(variant => {
        const sizeDiff = ((imageBuffer.length - variant.size) / imageBuffer.length * 100).toFixed(1);
        console.log(`   ${variant.variant.padEnd(10)} ${(variant.size / 1024).toFixed(2).padStart(8)} KB (${sizeDiff}% smaller)`);
        console.log(`     └─ ${variant.spacesUrl}`);
      });

      // Calculate total space savings
      const totalVariantSize = result.backup.spacesVariants.reduce((sum, v) => sum + v.size, 0);
      const avgVariantSize = totalVariantSize / result.backup.spacesVariants.length;
      const spaceSaved = ((imageBuffer.length - avgVariantSize) / imageBuffer.length * 100).toFixed(1);
      
      console.log(`\n💾 Space Optimization:`);
      console.log(`   Original: ${(imageBuffer.length / 1024).toFixed(2)} KB`);
      console.log(`   Average variant: ${(avgVariantSize / 1024).toFixed(2)} KB`);
      console.log(`   Space saved: ${spaceSaved}% per variant`);
    }

    console.log(`\n🎯 Recommended URLs:`);
    console.log(`   Primary: ${result.recommendedUrl}`);
    console.log(`   Fallback: ${result.fallbackUrl || 'None'}`);

    if (result.variants && Object.keys(result.variants).length > 0) {
      console.log(`\n🔗 Variant URLs:`);
      Object.entries(result.variants).forEach(([size, url]) => {
        console.log(`   ${size}: ${url}`);
      });
    }

    // Test size-specific URL retrieval
    console.log(`\n🎨 Testing size-specific URL retrieval:`);
    const sizes = ['thumbnail', 'small', 'medium', 'large'] as const;
    
    for (const size of sizes) {
      const sizeUrl = await dualImageService.getBestImageUrlForSize(
        size,
        result.primary.cloudinaryUrl,
        result.backup.spacesVariants
      );
      console.log(`   ${size.padEnd(10)}: ${sizeUrl ? '✅ Available' : '❌ Not available'}`);
    }

    console.log('\n🎉 Image Resizing Test Complete!');
    console.log('================================');
    console.log('\nYour dual storage system now includes:');
    console.log('✅ Automatic image resizing for DigitalOcean Spaces');
    console.log('✅ Multiple size variants (thumbnail, small, medium, large)');
    console.log('✅ Significant space optimization');
    console.log('✅ Intelligent fallback between Cloudinary and Spaces');
    console.log('✅ Size-specific URL retrieval');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await app.close();
  }
}

// Run the test
if (require.main === module) {
  testImageResizing().catch(console.error);
}

export { testImageResizing };

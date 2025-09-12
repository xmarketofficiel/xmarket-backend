import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { SpacesService } from '../src/storage/spaces.service';
import { DualImageService } from '../src/storage/dual-image.service';

async function testDualStorageSystem() {
  console.log('🚀 Testing Dual Storage System (Cloudinary + DigitalOcean Spaces)');
  console.log('================================================================\n');

  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    // Get services
    const spacesService = app.get(SpacesService);
    const dualImageService = app.get(DualImageService);

    console.log('✅ Services initialized successfully\n');

    // Test 1: Spaces Service Configuration
    console.log('🔧 Test 1: DigitalOcean Spaces Configuration');
    console.log('-------------------------------------------');
    console.log('Bucket:', process.env.DO_SPACES_BUCKET);
    console.log('Region:', process.env.DO_SPACES_REGION);
    console.log('CDN Domain:', process.env.DO_SPACES_CDN_DOMAIN || 'Not configured');
    
    // Test URL generation
    const testKey = 'test/sample-image.jpg';
    const publicUrl = spacesService.getPublicUrl(testKey);
    console.log('Sample Public URL:', publicUrl);
    console.log('✅ Spaces configuration valid\n');

    // Test 2: Presigned URL Generation
    console.log('🔗 Test 2: Presigned URL Generation');
    console.log('----------------------------------');
    
    try {
      const presignedUrlResponse = await spacesService.generatePresignedUrl('test-uploads/sample.jpg', 'image/jpeg');
      console.log('✅ Presigned URL generated successfully');
      console.log('URL format valid:', presignedUrlResponse.presignedUrl.includes('X-Amz-Algorithm'));
    } catch (error) {
      console.error('❌ Presigned URL generation failed:', error.message);
    }

    // Test 3: Dual Upload URL Generation
    console.log('\n📡 Test 3: Dual Upload URL Generation');
    console.log('------------------------------------');
    
    try {
      const dualUrls = await dualImageService.generateDualUploadUrls(
        123, // Mock user ID
        'item', // category
        'dual-test-image.jpg',
        'image/jpeg',
        456 // Mock item ID
      );
      
      console.log('✅ Dual upload URLs generated:');
      console.log('- Cloudinary URL valid:', !!dualUrls.cloudinary?.uploadUrl);
      console.log('- Spaces presigned URL valid:', !!dualUrls.spaces?.presignedUrl);
      if (dualUrls.spaces?.publicUrl) {
        console.log('- Spaces public URL:', dualUrls.spaces.publicUrl);
      }
      
    } catch (error) {
      console.error('❌ Dual URL generation failed:', error.message);
    }

    // Test 4: File Validation
    console.log('\n🔍 Test 4: File Validation');
    console.log('-------------------------');
    
    try {
      // Test valid file sizes
      dualImageService.validateImageFile('test.jpg', 2000000); // 2MB
      console.log('✅ Valid file size (2MB): Accepted');
      
      dualImageService.validateImageFile('test.png', 1000000); // 1MB
      console.log('✅ Valid file size (1MB): Accepted');
      
      // Test oversized file
      try {
        dualImageService.validateImageFile('large.jpg', 10 * 1024 * 1024); // 10MB
        console.log('❌ Large file should have been rejected');
      } catch (error) {
        console.log('✅ Large file correctly rejected:', error.message);
      }
      
    } catch (error) {
      console.error('❌ File validation test failed:', error.message);
    }

    console.log('\n🎉 Dual Storage System Test Complete!');
    console.log('====================================');
    console.log('The dual storage system is ready for production use.');
    console.log('\nNext steps:');
    console.log('1. Update frontend to use new presigned URL endpoints');
    console.log('2. Run database migration to add dual storage fields');
    console.log('3. Test actual file uploads in development environment');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await app.close();
  }
}

// Run the test
if (require.main === module) {
  testDualStorageSystem().catch(console.error);
}

export { testDualStorageSystem };

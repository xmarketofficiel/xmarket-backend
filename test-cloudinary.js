// Test script to verify Cloudinary integration
const { CloudinaryService } = require('./src/common/services/cloudinary.service');
const { ConfigService } = require('@nestjs/config');

// Mock ConfigService for testing
const configService = {
  get: (key) => {
    const config = {
      CLOUDINARY_CLOUD_NAME: 'dvkdhxivw',
      CLOUDINARY_API_KEY: '846262536178211',
      CLOUDINARY_API_SECRET: 'S4IN5KzqCF2EKPCa58lN8SZyRVU'
    };
    return config[key];
  }
};

async function testCloudinary() {
  console.log('Testing Cloudinary integration...');
  
  try {
    // This would normally be done with dependency injection in NestJS
    const cloudinaryService = new CloudinaryService(configService);
    
    console.log('✅ Cloudinary service initialized successfully');
    console.log('✅ Configuration loaded:');
    console.log(`   - Cloud Name: ${configService.get('CLOUDINARY_CLOUD_NAME')}`);
    console.log(`   - API Key: ${configService.get('CLOUDINARY_API_KEY').substring(0, 6)}...`);
    console.log('✅ Ready to upload images!');
    
  } catch (error) {
    console.error('❌ Error initializing Cloudinary:', error);
  }
}

testCloudinary();

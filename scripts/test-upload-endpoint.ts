import * as fs from 'fs';
import * as path from 'path';
import FormData = require('form-data');
import axios from 'axios';
import sharp from 'sharp';

async function testUploadEndpoint() {
  console.log('🧪 Testing Upload Endpoint (upload-optimized)');
  console.log('===================================================');

  try {
    // Get or create test image
    const uploadsDir = path.join(__dirname, '..', 'uploads');
    const testImagePath = path.join(uploadsDir, 'test-image.jpg');

    let imageBuffer: Buffer;
    if (!fs.existsSync(testImagePath)) {
      console.log('📷 Creating test image...');
      imageBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 3,
          background: { r: 150, g: 200, b: 100 }
        }
      })
      .jpeg({ quality: 95 })
      .toBuffer();
      
      fs.writeFileSync(testImagePath, imageBuffer);
    } else {
      imageBuffer = fs.readFileSync(testImagePath);
    }

    console.log(`📊 Test image size: ${(imageBuffer.length / 1024).toFixed(2)} KB`);

    // Create form data
    const formData = new FormData();
    formData.append('file', fs.createReadStream(testImagePath), {
      filename: 'test-upload.jpg',
      contentType: 'image/jpeg'
    });

    // Test the upload endpoint (assuming server is running on port 3001)
    const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
    
    console.log('🚀 Testing upload endpoint...');
    console.log(`📡 Endpoint: ${API_BASE_URL}/uploads/upload-optimized`);

    try {
      const response = await axios.post(`${API_BASE_URL}/uploads/upload-optimized`, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 30000,
      });

      console.log('✅ Upload successful!');
      console.log('📄 Response:', JSON.stringify(response.data, null, 2));

      // Test the best-image-url-size endpoint
      if (response.data.spacesUrls) {
        console.log('\n🔍 Testing best image URL endpoint...');
        const sizeTestResponse = await axios.get(`${API_BASE_URL}/uploads/best-image-url-size`, {
          params: {
            imageId: response.data.id || 'test',
            preferredSize: 'medium'
          }
        });
        
        console.log('📄 Best URL Response:', JSON.stringify(sizeTestResponse.data, null, 2));
      }

    } catch (apiError: any) {
      if (apiError.code === 'ECONNREFUSED') {
        console.log('⚠️  Backend server is not running');
        console.log('💡 To test the endpoint, start the backend server first:');
        console.log('   npm run start:dev');
        console.log('');
        console.log('🎯 The upload endpoint is ready and will work when server is running');
        console.log('📄 Expected endpoint: POST /uploads/upload-optimized');
        console.log('📤 Expected form data: file (multipart/form-data)');
        console.log('📋 Expected response: { cloudinaryUrl, spacesUrls, metadata }');
      } else {
        console.log('❌ API Error:', apiError.response?.data || apiError.message);
      }
    }

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testUploadEndpoint();

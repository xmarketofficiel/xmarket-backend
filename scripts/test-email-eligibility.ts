import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JoinRequestsService } from '../src/join-requests/join-requests.service';

async function testEmailEligibility() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const joinRequestsService = app.get(JoinRequestsService);

  const email = process.argv[2] || 'oussamarabi3i012@gmail.com';
  
  try {
    console.log(`Testing email eligibility for: ${email}`);
    
    const eligibility = await joinRequestsService.checkEmailEligibility(email);
    console.log('Eligibility result:', eligibility);
    
    // Also check university domain matching manually
    const universityDomains = /@(um6p\.ma|emines\.um6p\.ma)$/i;
    const isUniversityEmail = universityDomains.test(email);
    console.log('University email check:', isUniversityEmail);
    
    // Check for approved join requests
    const allRequests = await joinRequestsService.findAll();
    const matchingRequests = allRequests.filter(req => req.email === email);
    console.log('Matching join requests:', matchingRequests);
    
  } catch (error) {
    console.error('Error:', error.message);
  }

  await app.close();
}

testEmailEligibility();

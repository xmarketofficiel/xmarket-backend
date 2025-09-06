// Test script to verify waitlist API endpoints
const API_BASE = 'http://localhost:3001';

// Test email subscription
async function testEmailSubscription() {
  try {
    const response = await fetch(`${API_BASE}/waitlist/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@um6p.ma',
        notes: 'Test subscription from coming soon page'
      }),
    });

    const data = await response.json();
    console.log('✅ Email subscription test:', {
      status: response.status,
      data: data
    });
    
    return data;
  } catch (error) {
    console.error('❌ Email subscription failed:', error);
  }
}

// Test duplicate email
async function testDuplicateEmail() {
  try {
    const response = await fetch(`${API_BASE}/waitlist/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'student@um6p.ma',
        notes: 'Duplicate test'
      }),
    });

    const data = await response.json();
    console.log('✅ Duplicate email test:', {
      status: response.status,
      data: data
    });
  } catch (error) {
    console.error('❌ Duplicate email test failed:', error);
  }
}

// Test check subscription
async function testCheckSubscription(email) {
  try {
    const response = await fetch(`${API_BASE}/waitlist/check/${email}`);
    const data = await response.json();
    console.log('✅ Check subscription test:', {
      status: response.status,
      data: data
    });
  } catch (error) {
    console.error('❌ Check subscription failed:', error);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting waitlist API tests...\n');
  
  // Test 1: Subscribe new email
  await testEmailSubscription();
  
  // Test 2: Try duplicate email
  await testDuplicateEmail();
  
  // Test 3: Check if email is subscribed
  await testCheckSubscription('student@um6p.ma');
  
  console.log('\n✨ All tests completed!');
}

// Run tests if this script is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  const fetch = require('node-fetch');
  runTests();
} else {
  // Browser environment
  window.runWaitlistTests = runTests;
  console.log('Run tests by calling: runWaitlistTests()');
}

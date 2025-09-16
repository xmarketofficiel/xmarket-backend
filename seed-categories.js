#!/usr/bin/env node

/**
 * Simple script to seed categories in the database
 * Run with: node seed-categories.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://xmarket-backend-production-v1.up.railway.app';

async function seedCategories() {
  try {
    console.log('🌱 Seeding categories...');
    
    const response = await axios.post(`${API_BASE_URL}/categories/seed`);
    
    if (response.data.success) {
      console.log('✅ Categories seeded successfully!');
      console.log('📋 Message:', response.data.message);
    } else {
      console.log('⚠️ Seeding response:', response.data);
    }
  } catch (error) {
    console.error('❌ Error seeding categories:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the seeding
seedCategories();

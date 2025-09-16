#!/usr/bin/env node

/**
 * Simple script to check items in the database
 * Run with: node check-items.js
 */

const axios = require('axios');

const API_BASE_URL = process.env.API_BASE_URL || 'https://xmarket-backend-production-v1.up.railway.app';

async function checkItems() {
  try {
    console.log('🔍 Checking items in database...');
    
    // Check items
    const itemsResponse = await axios.get(`${API_BASE_URL}/items?limit=5`);
    console.log('📦 Items Response:', JSON.stringify(itemsResponse.data, null, 2));
    
    // Check categories
    const categoriesResponse = await axios.get(`${API_BASE_URL}/items/categories`);
    console.log('📋 Categories Response:', JSON.stringify(categoriesResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error checking data:');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
  }
}

// Run the check
checkItems();

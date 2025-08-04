/**
 * Test script for object search functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/images';

async function testObjectSearch() {
  console.log('🧪 Testing Object Search Functionality\n');

  const testQueries = [
    'sofa',
    'wooden table',
    'marble countertop',
    'modern chair',
    'traditional bed',
    'kitchen cabinet',
    'bathroom mirror',
    'dining table',
    'wardrobe',
    'lighting fixture'
  ];

  for (const query of testQueries) {
    console.log(`🔍 Testing query: "${query}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/object-search?query=${encodeURIComponent(query)}&limit=3`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.data.length} results`);
        console.log(`📊 Search metadata:`, {
          total_results: data.search_metadata.total_results,
          search_strategy: data.search_metadata.search_strategy,
          search_components: data.search_metadata.search_components
        });
        
        if (data.data.length > 0) {
          console.log(`🏆 Top result: ${data.data[0].image_id} (score: ${data.data[0].score})`);
          if (data.data[0].matched_objects && data.data[0].matched_objects.length > 0) {
            console.log(`🎯 Matched objects: ${data.data[0].matched_objects.map(obj => obj.tag).join(', ')}`);
          }
        }
      } else {
        console.log(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    console.log('---\n');
  }
}

async function testFocusedSearch() {
  console.log('🧪 Testing Focused Search (should fall back to object search)\n');

  const testQueries = [
    'sofa',
    'wooden furniture',
    'modern chair'
  ];

  for (const query of testQueries) {
    console.log(`🔍 Testing focused search for: "${query}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/focused-search?query=${encodeURIComponent(query)}&limit=3`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Found ${data.data.length} results`);
        console.log(`📊 Search metadata:`, {
          total_results: data.search_metadata.total_results,
          search_strategy: data.search_metadata.search_strategy,
          detected_room_type: data.search_metadata.detected_room_type,
          room_confidence: data.search_metadata.room_confidence
        });
      } else {
        console.log(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    console.log('---\n');
  }
}

async function runTests() {
  console.log('🚀 Starting Object Search Tests\n');
  
  await testObjectSearch();
  await testFocusedSearch();
  
  console.log('✅ All tests completed!');
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(console.error);
}

export { testObjectSearch, testFocusedSearch }; 
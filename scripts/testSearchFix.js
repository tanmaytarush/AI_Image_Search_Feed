import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/images';

async function testSearchFix() {
  console.log('🔧 Testing Search Fix');
  console.log('=' .repeat(40));
  
  const testQueries = [
    'bedroom',
    'kitchen',
    'living room',
    'bathroom'
  ];
  
  for (const query of testQueries) {
    try {
      console.log(`\n🔍 Testing query: "${query}"`);
      
      const response = await fetch(`${BASE_URL}/enhanced-search?query=${encodeURIComponent(query)}&limit=3`);
      const data = await response.json();
      
      if (data.success) {
        console.log(`✅ Search successful`);
        console.log(`📊 Found ${data.data.images.length} results`);
        
        // Check if images array exists and is properly formatted
        if (Array.isArray(data.data.images)) {
          console.log(`✅ Images array is valid`);
          
          // Show first result details
          if (data.data.images.length > 0) {
            const firstResult = data.data.images[0];
            console.log(`📋 First result: ${firstResult.room_type} (${firstResult.design_theme}) - Score: ${firstResult.score}`);
          }
        } else {
          console.log(`❌ Images array is not valid:`, typeof data.data.images);
        }
        
        // Check metadata
        if (data.data.metadata) {
          console.log(`📈 Metadata: ${JSON.stringify(data.data.metadata, null, 2)}`);
        }
        
      } else {
        console.log(`❌ Search failed: ${data.message}`);
      }
      
    } catch (error) {
      console.error(`❌ Error testing query "${query}":`, error.message);
    }
  }
  
  console.log('\n✅ Search fix test completed!');
}

// Run the test
testSearchFix().catch(console.error); 
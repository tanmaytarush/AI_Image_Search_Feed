import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000/api/images';

// Test queries to demonstrate different search capabilities
const testQueries = [
  // Fuzzy search tests
  { query: "bedrum", description: "Fuzzy match for 'bedroom'" },
  { query: "kitchin", description: "Fuzzy match for 'kitchen'" },
  { query: "livin room", description: "Fuzzy match for 'living room'" },
  { query: "bathrom", description: "Fuzzy match for 'bathroom'" },
  
  // AI search tests
  { query: "traditional indian bedroom", description: "AI search with cultural context" },
  { query: "modern minimalist kitchen", description: "AI search with style context" },
  { query: "luxury master bedroom", description: "AI search with budget context" },
  { query: "pooja room design", description: "AI search with cultural room type" },
  
  // Semantic search tests
  { query: "sleeping area", description: "Semantic match for bedroom" },
  { query: "cooking space", description: "Semantic match for kitchen" },
  { query: "relaxation zone", description: "Semantic match for living room" },
  { query: "prayer area", description: "Semantic match for pooja room" },
  
  // Hybrid search tests
  { query: "modrn bedrm", description: "Hybrid: fuzzy + AI + semantic" },
  { query: "tradishnal kitchin", description: "Hybrid: fuzzy + cultural context" },
  { query: "luxry bathrom", description: "Hybrid: fuzzy + style context" },
  { query: "contempory livin", description: "Hybrid: fuzzy + modern context" }
];

async function testSearch(searchType, query, description) {
  try {
    console.log(`\n🔍 Testing ${searchType.toUpperCase()} Search:`);
    console.log(`Query: "${query}"`);
    console.log(`Description: ${description}`);
    
    const url = `${BASE_URL}/${searchType}-search?query=${encodeURIComponent(query)}&limit=5`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ ${searchType} search successful`);
      console.log(`📊 Found ${data.data.images.length} results`);
      
      // Show top 3 results with scores
      data.data.images.slice(0, 3).forEach((image, index) => {
        const score = image.score || image.fuzzy_score || image.ai_score || image.semantic_score || 0;
        console.log(`  ${index + 1}. ${image.room_type} (${image.design_theme}) - Score: ${score.toFixed(3)}`);
      });
      
      // Show metadata if available
      if (data.data.metadata) {
        console.log(`📈 Metadata: ${JSON.stringify(data.data.metadata, null, 2)}`);
      }
    } else {
      console.log(`❌ ${searchType} search failed: ${data.message}`);
    }
    
  } catch (error) {
    console.error(`❌ Error testing ${searchType} search:`, error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Enhanced Search Tests');
  console.log('=' .repeat(50));
  
  for (const testQuery of testQueries) {
    // Test fuzzy search
    await testSearch('fuzzy', testQuery.query, testQuery.description);
    
    // Test AI search
    await testSearch('ai', testQuery.query, testQuery.description);
    
    // Test semantic search
    await testSearch('semantic', testQuery.query, testQuery.description);
    
    // Test hybrid search
    await testSearch('enhanced', testQuery.query, testQuery.description);
    
    console.log('\n' + '=' .repeat(50));
  }
  
  console.log('✅ All tests completed!');
}

// Run the tests
runAllTests().catch(console.error); 
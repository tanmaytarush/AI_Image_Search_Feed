import imageService from '../src/services/imageService.js';
import searchIntelligenceService from '../src/services/searchIntelligenceService.js';

async function demonstrateExactSearch() {
  console.log("🎯 EXACT SEARCH DEMONSTRATION");
  console.log("=" .repeat(50));
  
  try {
    // Test different exact search scenarios
    const exactSearchQueries = [
      "kitchen",
      "modern bedroom",
      "puja room",
      "wooden furniture",
      "marble flooring",
      "exact modern kitchen",
      "precise traditional bedroom",
      '"living room"',
      'specific "dining area"',
      "kitchen with exact wooden cabinets"
    ];

    for (const query of exactSearchQueries) {
      console.log(`\n🔍 Testing exact search: "${query}"`);
      console.log("-".repeat(40));
      
      // 1. Detect exact search intent
      console.log("🧠 Exact Search Intent Detection:");
      const exactSearchIntent = searchIntelligenceService.detectExactSearchIntent(query);
      console.log(`   Is Exact Search: ${exactSearchIntent.isExactSearch}`);
      console.log(`   Confidence: ${exactSearchIntent.confidence.toFixed(3)}`);
      console.log(`   Exact Terms: ${exactSearchIntent.exactTerms.join(', ') || 'none'}`);
      console.log(`   Specific Terms: ${exactSearchIntent.specificTerms.join(', ') || 'none'}`);
      
      // 2. Enhance query for exact search
      console.log("\n🔧 Query Enhancement:");
      const enhancedQuery = await searchIntelligenceService.enhanceSearchQuery(query);
      console.log(`   Enhanced Query: ${JSON.stringify(enhancedQuery.enhanced_query, null, 2)}`);
      console.log(`   Exact Search Enabled: ${enhancedQuery.exact_search?.enabled || false}`);
      console.log(`   Search Weights: ${JSON.stringify(enhancedQuery.search_weights, null, 2)}`);
      
      // 3. Perform full search with exact matching
      console.log("\n🔍 Full Search with Exact Matching:");
      const searchResults = await imageService.searchImages(query, 5);
      console.log(`   Total Results: ${searchResults.images.length}`);
      console.log(`   Search Strategy: ${searchResults.search_metadata.search_strategy}`);
      console.log(`   Exact Search Enabled: ${searchResults.search_metadata.exact_search_enabled}`);
      console.log(`   Exact Search Confidence: ${searchResults.search_metadata.exact_search_confidence.toFixed(3)}`);
      
      if (searchResults.images.length > 0) {
        console.log("\n📊 Top Results:");
        searchResults.images.slice(0, 3).forEach((result, index) => {
          console.log(`   ${index + 1}. ${result.room_type || 'unknown'} - ${result.design_theme || 'unknown'}`);
          console.log(`      Score: ${result.score?.toFixed(3)} | AI Relevance: ${result.ai_relevance_score?.toFixed(3)}`);
          console.log(`      Exact Match: ${result.exact_match} | Search Count: ${result.search_count}`);
          console.log(`      Vector Matches: ${result.vector_matches?.join(', ') || 'none'}`);
        });
      }
    }
    
    // Demonstrate exact search benefits
    console.log("\n✅ EXACT SEARCH BENEFITS:");
    console.log("=" .repeat(50));
    console.log("🎯 Precise Matching: Finds exact text matches in database");
    console.log("🔍 Phrase Search: Supports quoted phrases for exact matching");
    console.log("📝 Word Boundary: Respects word boundaries for accurate matching");
    console.log("🏠 Room Type Matching: Perfect for specific room type searches");
    console.log("🎨 Design Theme Matching: Exact style and theme matching");
    console.log("🪑 Object Matching: Precise furniture and material matching");
    console.log("🌍 Cultural Terms: Supports regional and cultural terminology");
    console.log("⚡ Fast Results: Direct text matching without vector computation");
    console.log("🎯 High Relevance: Exact matches get highest priority in results");
    
    // Compare exact vs semantic search
    console.log("\n🔄 EXACT vs SEMANTIC SEARCH COMPARISON:");
    console.log("=" .repeat(50));
    
    const comparisonQueries = [
      "kitchen",
      "modern bedroom",
      "puja room"
    ];
    
    for (const query of comparisonQueries) {
      console.log(`\n🔍 Query: "${query}"`);
      
      // Exact search intent
      const exactIntent = searchIntelligenceService.detectExactSearchIntent(query);
      console.log(`   Exact Search Intent: ${exactIntent.isExactSearch} (confidence: ${exactIntent.confidence.toFixed(3)})`);
      
      // Perform search
      const results = await imageService.searchImages(query, 3);
      console.log(`   Results: ${results.images.length} found`);
      console.log(`   Strategy: ${results.search_metadata.search_strategy}`);
      
      if (results.images.length > 0) {
        const exactMatches = results.images.filter(img => img.exact_match);
        const semanticMatches = results.images.filter(img => !img.exact_match);
        
        console.log(`   Exact Matches: ${exactMatches.length}`);
        console.log(`   Semantic Matches: ${semanticMatches.length}`);
        
        if (exactMatches.length > 0) {
          console.log(`   Top Exact Match: ${exactMatches[0].room_type} - Score: ${exactMatches[0].score?.toFixed(3)}`);
        }
        if (semanticMatches.length > 0) {
          console.log(`   Top Semantic Match: ${semanticMatches[0].room_type} - Score: ${semanticMatches[0].score?.toFixed(3)}`);
        }
      }
    }
    
    console.log("\n🎉 EXACT SEARCH DEMONSTRATION COMPLETED!");
    
  } catch (error) {
    console.error("❌ Error in exact search demonstration:", error);
  }
}

// Run the demonstration
demonstrateExactSearch().catch(console.error); 
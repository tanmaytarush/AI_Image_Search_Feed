import qdrantService from '../src/services/qdrantService.js';
import embeddingService from '../src/services/embeddingService.js';

async function demonstrateHybridSearch() {
  console.log("🚀 HYBRID SEARCH DEMONSTRATION");
  console.log("=" .repeat(50));
  
  try {
    // Test different search scenarios
    const searchQueries = [
      "modern living room",
      "traditional indian bedroom", 
      "kitchen with wooden cabinets",
      "minimalist design",
      "colorful furniture"
    ];

    for (const query of searchQueries) {
      console.log(`\n🔍 Testing search: "${query}"`);
      console.log("-".repeat(30));
      
      // 1. Text-only search (ANN)
      console.log("📝 Text Search (ANN embeddings):");
      const textResults = await qdrantService.hybridSearch(query, 'text', 5);
      console.log(`   Found ${textResults.results.length} results`);
      if (textResults.results.length > 0) {
        console.log(`   Top result: ${textResults.results[0].payload?.room_type || 'unknown'} - Score: ${textResults.results[0].score?.toFixed(3)}`);
      }
      
      // 2. Visual search (CNN)
      console.log("🖼️  Visual Search (CNN features):");
      const visualResults = await qdrantService.hybridSearch(query, 'visual', 5);
      console.log(`   Found ${visualResults.results.length} results`);
      if (visualResults.results.length > 0) {
        console.log(`   Top result: ${visualResults.results[0].payload?.room_type || 'unknown'} - Score: ${visualResults.results[0].score?.toFixed(3)}`);
      }
      
      // 3. Hybrid search (CNN + ANN combined)
      console.log("🧠 Hybrid Search (CNN + ANN):");
      const hybridResults = await qdrantService.hybridSearch(query, 'hybrid', 5);
      console.log(`   Found ${hybridResults.results.length} results`);
      if (hybridResults.results.length > 0) {
        console.log(`   Top result: ${hybridResults.results[0].payload?.room_type || 'unknown'} - Score: ${hybridResults.results[0].score?.toFixed(3)}`);
        console.log(`   Sources: ${hybridResults.results[0].sources?.join(', ') || 'unknown'}`);
      }
    }
    
    // Demonstrate embedding generation
    console.log("\n🔧 EMBEDDING GENERATION DEMO");
    console.log("=" .repeat(50));
    
    const testImage = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400";
    console.log(`Testing image: ${testImage}`);
    
    // Generate CNN visual features
    console.log("\n📊 CNN Visual Features (ResNet-50):");
    const visualFeatures = await embeddingService.extractVisualFeatures(testImage);
    console.log(`   Dimensions: ${visualFeatures.length}d`);
    console.log(`   Feature range: ${Math.min(...visualFeatures).toFixed(4)} to ${Math.max(...visualFeatures).toFixed(4)}`);
    console.log(`   First 5 features: [${visualFeatures.slice(0, 5).map(f => f.toFixed(4)).join(', ')}]`);
    
    // Generate ANN text embeddings
    console.log("\n📝 ANN Text Embeddings (Sentence Transformer):");
    const testText = "modern living room with wooden furniture";
    const textEmbedding = await embeddingService.getEmbedding(testText, "Interior design search");
    console.log(`   Dimensions: ${textEmbedding.length}d`);
    console.log(`   Feature range: ${Math.min(...textEmbedding).toFixed(4)} to ${Math.max(...textEmbedding).toFixed(4)}`);
    console.log(`   First 5 features: [${textEmbedding.slice(0, 5).map(f => f.toFixed(4)).join(', ')}]`);
    
    // Generate hybrid vectors
    console.log("\n🧠 Hybrid Vectors (CNN + ANN):");
    const mockAnalysis = {
      room: "living room",
      theme: "modern",
      primary_features: ["wooden furniture", "minimalist design"],
      objects: [{ type: "sofa", features: ["leather", "comfortable"] }],
      visual_attributes: { colors: ["brown", "white"], materials: ["wood", "leather"] }
    };
    
    const hybridVectors = await embeddingService.createHybridVectors(
      mockAnalysis,
      "Modern living room with elegant wooden furniture",
      {},
      testImage,
      "demo_image"
    );
    
    console.log(`   Visual features: ${hybridVectors.visual_features.length}d`);
    console.log(`   Primary search: ${hybridVectors.primary_search.length}d`);
    console.log(`   Semantic desc: ${hybridVectors.semantic_desc.length}d`);
    console.log(`   Object focus: ${hybridVectors.object_focus.length}d`);
    
    console.log("\n✅ HYBRID SEARCH BENEFITS:");
    console.log("=" .repeat(50));
    console.log("🎯 Better Results: CNN visual + ANN text = comprehensive matching");
    console.log("🔍 Visual Similarity: Finds images that look similar even with poor text");
    console.log("📝 Semantic Understanding: Understands context and meaning");
    console.log("🎨 Style Matching: Captures design styles and aesthetics");
    console.log("🪑 Object Recognition: Identifies furniture and materials");
    console.log("🌍 Cultural Context: Understands regional and cultural elements");
    
  } catch (error) {
    console.error("❌ Error in hybrid search demonstration:", error);
  }
}

// Run the demonstration
demonstrateHybridSearch(); 
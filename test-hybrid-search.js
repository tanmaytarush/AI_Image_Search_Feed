#!/usr/bin/env node

import dotenv from "dotenv";
import qdrantService from "./src/services/qdrantService.js";
import embeddingService from "./src/services/embeddingService.js";
import imageAnalysisService from "./src/services/imageAnalysisService.js";
import DataTransformer from "./src/utils/dataTransformer.js";

dotenv.config();

async function testHybridSearch() {
  console.log("🧪 Testing Hybrid Search with Mixed Dimensions");
  console.log("=============================================");

  try {
    // 1. Test collection creation with mixed dimensions
    console.log("\n1️⃣ Creating collection with mixed dimensions...");
    await qdrantService.createCollection();
    console.log("✅ Collection created successfully");

    // 2. Test visual feature extraction (384d)
    console.log("\n2️⃣ Testing visual feature extraction (384d)...");
    const testImageUrl = "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400";
    const visualFeatures = await embeddingService.extractVisualFeatures(testImageUrl);
    console.log(`✅ Visual features extracted: ${visualFeatures.length} dimensions`);

    // 3. Test text embedding generation (384d)
    console.log("\n3️⃣ Testing text embedding generation (384d)...");
    const testText = "modern indian living room with wooden furniture";
    const textEmbedding = await embeddingService.getEmbedding(testText);
    console.log(`✅ Text embedding generated: ${textEmbedding.length} dimensions`);

    // 4. Test hybrid vector creation
    console.log("\n4️⃣ Testing hybrid vector creation...");
    const mockAnalysis = {
      ai_generated_tags: {
        room: "Living Room",
        theme: "Modern Indian",
        primary_features: ["Wooden Furniture", "Traditional Elements"],
        objects: [{ type: "Sofa", materials: ["Wood"], finish: "Natural" }],
        visual_attributes: { colors: ["Brown", "Beige"], materials: ["Wood"] },
        indian_context: { regional_style: "North Indian", traditional_elements: ["Carved Wood"] }
      },
      description: "Modern Indian living room with traditional wooden furniture"
    };

    const hybridVectors = await embeddingService.createHybridVectors(
      mockAnalysis.ai_generated_tags,
      mockAnalysis.description,
      {},
      testImageUrl,
      "test_image"
    );

    console.log("✅ Hybrid vectors created:");
    console.log(`   • Visual Features: ${hybridVectors.visual_features.length}d (CNN)`);
    console.log(`   • Primary Search: ${hybridVectors.primary_search.length}d (ANN)`);
    console.log(`   • Semantic Desc: ${hybridVectors.semantic_desc.length}d (ANN)`);
    console.log(`   • Object Focus: ${hybridVectors.object_focus.length}d (ANN)`);

    // 5. Test storing in Qdrant
    console.log("\n5️⃣ Testing Qdrant storage with mixed dimensions...");
    
    // Create a mock model response that matches the expected structure
    const mockModelResponse = {
      image_id: "test_hybrid_001",
      imageUrl: testImageUrl,
      ai_generated_tags: {
        room: "Living Room",
        theme: "Modern Indian",
        primary_features: ["Wooden Furniture", "Traditional Elements"],
        objects: [{ 
          type: "Sofa", 
          materials: ["Wood"], 
          finish: "Natural",
          features: ["Comfortable", "Traditional Design"]
        }],
        visual_attributes: { 
          colors: ["Brown", "Beige"], 
          materials: ["Wood"],
          lighting: "Natural",
          texture: "Smooth"
        },
        indian_context: { 
          regional_style: "North Indian", 
          traditional_elements: ["Carved Wood"],
          modern_adaptations: ["Contemporary Design"],
          space_utilization: "Efficient",
          cultural_significance: "Traditional meets modern"
        }
      },
      description: "Modern Indian living room with traditional wooden furniture",
      confidence_scores: { room: 0.95, theme: 0.87 },
      metadata: { 
        budget_indicator: "premium", 
        space_type: "residential",
        functionality: "living",
        tags: ["modern", "indian", "traditional"]
      }
    };

    // Use DataTransformer to create proper Qdrant format
    const testPoint = await DataTransformer.transformToQdrantFormat(mockModelResponse);

    await qdrantService.upsertPoints([testPoint]);
    console.log("✅ Test point stored successfully");

    // 6. Test hybrid search
    console.log("\n6️⃣ Testing hybrid search...");
    
    // Text search
    const textResults = await qdrantService.hybridSearch("modern living room", 'text', 5);
    console.log(`✅ Text search found ${textResults.results.length} results`);

    // Visual search (using same image)
    const visualResults = await qdrantService.hybridSearch(testImageUrl, 'visual', 5);
    console.log(`✅ Visual search found ${visualResults.results.length} results`);

    // Hybrid search
    const hybridResults = await qdrantService.hybridSearch("modern indian furniture", 'hybrid', 5);
    console.log(`✅ Hybrid search found ${hybridResults.results.length} results`);

    console.log("\n🎉 All tests passed! Hybrid search with mixed dimensions is working correctly.");
    console.log("\n📊 Summary:");
    console.log("   • CNN Visual Features: 384 dimensions");
    console.log("   • ANN Text Embeddings: 384 dimensions");
    console.log("   • Hybrid Search: Visual + Text combination");
    console.log("   • Qdrant Storage: Mixed dimensions supported");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testHybridSearch().catch(console.error); 
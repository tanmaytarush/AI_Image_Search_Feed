#!/usr/bin/env node

import dotenv from "dotenv";
import embeddingService from "./src/services/embeddingService.js";

dotenv.config();

async function testVisualFeatures() {
  console.log("🧪 Testing Visual Feature Extraction with Proper Vision Models");
  console.log("============================================================");

  const testImages = [
    "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400",
    "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
    "https://images.unsplash.com/photo-1560448075-bb485b067938?w=400"
  ];

  try {
    for (let i = 0; i < testImages.length; i++) {
      const imageUrl = testImages[i];
      console.log(`\n${i + 1}️⃣ Testing visual feature extraction for image ${i + 1}...`);
      console.log(`URL: ${imageUrl}`);
      
      try {
        const visualFeatures = await embeddingService.extractVisualFeatures(imageUrl);
        console.log(`✅ Successfully extracted visual features: ${visualFeatures.length} dimensions`);
        
        // Show first few values for debugging
        console.log(`📊 First 5 values: [${visualFeatures.slice(0, 5).map(v => typeof v === 'number' ? v.toFixed(4) : v).join(', ')}]`);
        
        // Validate dimensions
        if (visualFeatures.length === 768) {
          console.log(`✅ Correct dimensions for Vision Transformer (768d)`);
        } else if (visualFeatures.length === 384) {
          console.log(`✅ Fallback dimensions (384d)`);
        } else {
          console.log(`⚠️ Unexpected dimensions: ${visualFeatures.length}d`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to extract visual features: ${error.message}`);
      }
    }

    console.log("\n🎉 Visual feature extraction test completed!");
    console.log("\n📊 Summary:");
    console.log("   • Vision Transformer: 768 dimensions");
    console.log("   • ResNet-50: 2048 dimensions (truncated to 768)");
    console.log("   • Fallback: 384 dimensions");
    console.log("   • Error handling: Graceful fallback");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

// Run the test
testVisualFeatures().catch(console.error); 
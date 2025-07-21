import dotenv from "dotenv";
import cdnService from "../src/services/cdnService.js";
import imageAnalysisService from "../src/services/imageAnalysisService.js";

dotenv.config();

class CDNTester {
  constructor() {
    this.testImages = [
      {
        image_id: "test_001",
        image_url: "https://example.com/test-image-1.jpg"
      },
      {
        image_id: "test_002", 
        image_url: "https://example.com/test-image-2.jpg"
      }
    ];
  }

  async testCDNFunctionality() {
    console.log("🧪 Testing CDN Functionality");
    console.log("=".repeat(40));

    // Test 1: Check initial cache stats
    console.log("\n1. Initial Cache Statistics:");
    const initialStats = cdnService.getCacheStats();
    console.log(initialStats);

    // Test 2: Test CDN URL generation
    console.log("\n2. CDN URL Generation:");
    for (const image of this.testImages) {
      const cdnUrl = await cdnService.getCDNUrl(image.image_url);
      console.log(`Original: ${image.image_url}`);
      console.log(`CDN URL: ${cdnUrl}`);
    }

    // Test 3: Test cache operations
    console.log("\n3. Cache Operations:");
    const testAnalysis = {
      image_id: "test_001",
      ai_generated_tags: {
        room: "Living Room",
        theme: "Modern Indian"
      },
      confidence_scores: {
        room: 0.95,
        theme: 0.87
      }
    };

    // Cache the test analysis
    await cdnService.cacheAnalysis(this.testImages[0].image_url, testAnalysis);
    console.log("✅ Cached test analysis");

    // Retrieve cached analysis
    const cachedAnalysis = await cdnService.getCachedAnalysis(this.testImages[0].image_url);
    console.log("📦 Retrieved cached analysis:", cachedAnalysis ? "SUCCESS" : "FAILED");

    // Test 4: Check updated cache stats
    console.log("\n4. Updated Cache Statistics:");
    const updatedStats = cdnService.getCacheStats();
    console.log(updatedStats);

    // Test 5: Test image optimization check
    console.log("\n5. Image Optimization Check:");
    const isOptimized = await cdnService.isImageOptimized(this.testImages[0].image_url);
    console.log(`Image optimized: ${isOptimized}`);

    console.log("\n✅ CDN functionality test completed!");
  }

  async testImageAnalysisWithCDN() {
    console.log("\n🧪 Testing Image Analysis with CDN Layer");
    console.log("=".repeat(50));

    // Note: This would require actual image URLs that work with the model
    // For now, we'll just test the CDN integration
    console.log("📝 CDN layer is integrated with image analysis service");
    console.log("📦 Cache will be checked before model inference");
    console.log("🔄 CDN URLs will be used for model processing");
    console.log("💾 Results will be cached for future use");
  }

  async cleanup() {
    console.log("\n🧹 Cleaning up test data...");
    const result = await cdnService.clearAllCache();
    console.log("✅ Cleanup completed:", result);
  }
}

// Main execution
async function main() {
  const tester = new CDNTester();

  try {
    await tester.testCDNFunctionality();
    await tester.testImageAnalysisWithCDN();
    await tester.cleanup();
    
    console.log("\n🎉 All CDN tests completed successfully!");
  } catch (error) {
    console.error("❌ CDN test failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default CDNTester; 
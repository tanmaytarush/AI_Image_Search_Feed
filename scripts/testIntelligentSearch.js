import dotenv from "dotenv";
import queryIntelligenceService from "../src/services/queryIntelligenceService.js";
import imageService from "../src/services/imageService.js";

dotenv.config();

class IntelligentSearchTester {
  constructor() {
    this.testQueries = [
      "modern bedroom",
      "kitchen design",
      "living room interior",
      "bathroom renovation",
      "study room setup",
      "entrance hall",
      "staircase design",
      "balcony garden",
      "pooja room",
      "master bedroom with storage",
      "modular kitchen",
      "family living space",
      "guest bedroom",
      "home office setup",
      "dining area"
    ];
  }

  async testIntelligentRoomTypeDetection() {
    console.log("🧠 Testing Intelligent Room Type Detection");
    console.log("=".repeat(50));

    for (const query of this.testQueries) {
      console.log(`\n🔍 Testing query: "${query}"`);
      
      try {
        const detectedRoomType = await queryIntelligenceService.detectRoomType(query);
        console.log(`✅ Detected room type: ${detectedRoomType || 'none'}`);
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  async testSearchWithIntelligence() {
    console.log("\n🔍 Testing Search with Intelligence");
    console.log("=".repeat(40));

    const testQueries = [
      "modern bedroom",
      "kitchen design",
      "living room"
    ];

    for (const query of testQueries) {
      console.log(`\n📝 Testing search for: "${query}"`);
      
      try {
        const results = await imageService.searchImages(query, 3);
        console.log(`✅ Found ${results.images.length} results`);
        
        if (results.images.length > 0) {
          console.log("📋 Results:");
          results.images.forEach((result, index) => {
            console.log(`  ${index + 1}. ${result.room_type} (${result.design_theme}) - Score: ${result.score.toFixed(3)}`);
          });
        }
      } catch (error) {
        console.log(`❌ Error: ${error.message}`);
      }
    }
  }

  async testQueryInsights() {
    console.log("\n📊 Testing Query Insights");
    console.log("=".repeat(30));

    try {
      const insights = await imageService.getQueryInsights();
      console.log("📈 Query Intelligence Insights:");
      console.log(`  Total queries: ${insights.totalQueries}`);
      console.log(`  Room type stats: ${JSON.stringify(insights.roomTypeStats, null, 2)}`);
      console.log(`  Learned patterns: ${JSON.stringify(insights.learnedPatterns, null, 2)}`);
    } catch (error) {
      console.log(`❌ Error getting insights: ${error.message}`);
    }
  }

  async testLearningCapabilities() {
    console.log("\n🎓 Testing Learning Capabilities");
    console.log("=".repeat(35));

    // Test with some queries to build learning data
    const learningQueries = [
      "modern bedroom with storage",
      "contemporary kitchen design",
      "traditional living room",
      "minimalist bathroom"
    ];

    console.log("📚 Running learning queries...");
    for (const query of learningQueries) {
      await queryIntelligenceService.detectRoomType(query);
    }

    // Show insights after learning
    console.log("\n📊 Insights after learning:");
    const insights = await imageService.getQueryInsights();
    console.log(`  Total queries: ${insights.totalQueries}`);
    console.log(`  Room type distribution: ${JSON.stringify(insights.roomTypeStats, null, 2)}`);
  }

  async testExistingDataDiscovery() {
    console.log("\n🔍 Testing Existing Data Discovery");
    console.log("=".repeat(35));

    try {
      const existingRoomTypes = await queryIntelligenceService.getExistingRoomTypes();
      console.log(`📋 Found ${existingRoomTypes.length} existing room types in data:`);
      existingRoomTypes.forEach((roomType, index) => {
        console.log(`  ${index + 1}. ${roomType}`);
      });
    } catch (error) {
      console.log(`❌ Error discovering existing data: ${error.message}`);
    }
  }

  async cleanup() {
    console.log("\n🧹 Cleaning up test data...");
    queryIntelligenceService.resetLearning();
    console.log("✅ Learning data reset");
  }
}

// Main execution
async function main() {
  const tester = new IntelligentSearchTester();

  try {
    await tester.testExistingDataDiscovery();
    await tester.testIntelligentRoomTypeDetection();
    await tester.testLearningCapabilities();
    await tester.testSearchWithIntelligence();
    await tester.testQueryInsights();
    await tester.cleanup();
    
    console.log("\n🎉 Intelligent search testing completed successfully!");
  } catch (error) {
    console.error("❌ Intelligent search testing failed:", error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default IntelligentSearchTester; 
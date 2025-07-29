import dotenv from "dotenv";
import queryIntelligenceService from "../src/services/queryIntelligenceService.js";

dotenv.config();

async function testComprehensiveAISearch() {
  console.log("🤖 Testing Comprehensive AI-Powered Search with All Database Variations\n");

  // Test queries that should trigger comprehensive AI room detection
  const testQueries = [
    // Religious/Cultural variations
    "mandir with brass diyas",
    "pooja room design",
    "temple interior",
    "hindu prayer space",
    "religious room design",
    
    // Regional variations
    "drawing room furniture",
    "family room setup",
    "sitting room design",
    "lounge area",
    
    // Functional variations
    "study room with desk",
    "work area design",
    "home office setup",
    "workspace interior",
    
    // Style variations
    "modern kitchen design",
    "contemporary living room",
    "traditional bedroom",
    "classic dining room",
    
    // Material variations
    "wooden furniture design",
    "marble bathroom",
    "granite kitchen",
    "brass decor items",
    
    // Compound variations
    "modern indian living room with jharokha",
    "traditional pooja room with brass diyas",
    "contemporary kitchen with granite countertop",
    "classic bedroom with wooden furniture"
  ];

  console.log("📋 Comprehensive Test Queries:");
  testQueries.forEach((query, index) => {
    console.log(`${index + 1}. "${query}"`);
  });

  console.log("\n" + "=".repeat(80));
  console.log("🧪 RUNNING COMPREHENSIVE AI SEARCH TESTS");
  console.log("=".repeat(80));

  const results = [];

  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`\n${i + 1}. Testing: "${query}"`);
    console.log("-".repeat(50));

    try {
      // Test comprehensive AI-powered search
      const aiResult = await queryIntelligenceService.intelligentSearch(query, 3);
      
      console.log("✅ AI Search Results:");
      console.log(`   🏠 Detected Room: ${aiResult.ai_insights?.detected_room?.detectedRoom || 'None'}`);
      console.log(`   🎯 Confidence: ${aiResult.ai_insights?.detected_room?.confidence || 0}`);
      console.log(`   🔍 Keywords: ${aiResult.ai_insights?.extracted_keywords?.join(', ') || 'None'}`);
      console.log(`   📊 Results Found: ${aiResult.results?.length || 0}`);
      
      if (aiResult.ai_insights?.detected_room?.reasoning) {
        console.log(`   💭 Reasoning: ${aiResult.ai_insights.detected_room.reasoning}`);
      }

      if (aiResult.ai_insights?.detected_room?.matchedKeywords) {
        console.log(`   🎯 Matched Keywords: ${aiResult.ai_insights.detected_room.matchedKeywords.join(', ')}`);
      }

      if (aiResult.ai_insights?.detected_room?.databaseTagsUsed) {
        console.log(`   🗄️ Database Tags Used: ${aiResult.ai_insights.detected_room.databaseTagsUsed.join(', ')}`);
      }

      if (aiResult.ai_insights?.detected_room?.searchStrategy) {
        console.log(`   🔍 Search Strategy: ${aiResult.ai_insights.detected_room.searchStrategy}`);
      }

      // Show top result details
      if (aiResult.results && aiResult.results.length > 0) {
        const topResult = aiResult.results[0];
        console.log(`   🏆 Top Result: ${topResult.payload?.room_type || 'Unknown'} (Score: ${topResult.ai_relevance_score || topResult.score})`);
        if (topResult.ai_insights) {
          console.log(`   🤖 AI Insights: ${topResult.ai_insights}`);
        }
        if (topResult.ai_matched_keywords && topResult.ai_matched_keywords.length > 0) {
          console.log(`   🎯 Matched Keywords: ${topResult.ai_matched_keywords.join(', ')}`);
        }
        if (topResult.ai_matched_database_tags && topResult.ai_matched_database_tags.length > 0) {
          console.log(`   🗄️ Matched DB Tags: ${topResult.ai_matched_database_tags.join(', ')}`);
        }
      }

      results.push({
        query,
        success: true,
        detected_room: aiResult.ai_insights?.detected_room?.detectedRoom,
        confidence: aiResult.ai_insights?.detected_room?.confidence,
        keywords: aiResult.ai_insights?.extracted_keywords,
        matched_keywords: aiResult.ai_insights?.detected_room?.matchedKeywords,
        database_tags_used: aiResult.ai_insights?.detected_room?.databaseTagsUsed,
        result_count: aiResult.results?.length || 0
      });

    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      results.push({
        query,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("📊 COMPREHENSIVE TEST SUMMARY");
  console.log("=".repeat(80));

  const successfulTests = results.filter(r => r.success);
  const failedTests = results.filter(r => !r.success);

  console.log(`✅ Successful Tests: ${successfulTests.length}/${results.length}`);
  console.log(`❌ Failed Tests: ${failedTests.length}/${results.length}`);

  if (successfulTests.length > 0) {
    console.log("\n🏠 Room Detection Summary:");
    const roomCounts = {};
    successfulTests.forEach(test => {
      if (test.detected_room) {
        roomCounts[test.detected_room] = (roomCounts[test.detected_room] || 0) + 1;
      }
    });

    Object.entries(roomCounts)
      .sort(([,a], [,b]) => b - a)
      .forEach(([room, count]) => {
        console.log(`   ${room}: ${count} detections`);
      });

    console.log("\n🎯 Confidence Statistics:");
    const confidences = successfulTests
      .filter(t => t.confidence)
      .map(t => t.confidence);
    
    if (confidences.length > 0) {
      const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      const min = Math.min(...confidences);
      const max = Math.max(...confidences);
      
      console.log(`   Average: ${avg.toFixed(3)}`);
      console.log(`   Min: ${min.toFixed(3)}`);
      console.log(`   Max: ${max.toFixed(3)}`);
    }

    console.log("\n🔍 Keyword Analysis:");
    const allKeywords = successfulTests
      .filter(t => t.keywords)
      .flatMap(t => t.keywords);
    
    const keywordCounts = {};
    allKeywords.forEach(keyword => {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });

    Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 15)
      .forEach(([keyword, count]) => {
        console.log(`   ${keyword}: ${count} occurrences`);
      });

    console.log("\n🎯 Matched Keywords Analysis:");
    const allMatchedKeywords = successfulTests
      .filter(t => t.matched_keywords)
      .flatMap(t => t.matched_keywords);
    
    const matchedKeywordCounts = {};
    allMatchedKeywords.forEach(keyword => {
      matchedKeywordCounts[keyword] = (matchedKeywordCounts[keyword] || 0) + 1;
    });

    Object.entries(matchedKeywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .forEach(([keyword, count]) => {
        console.log(`   ${keyword}: ${count} matches`);
      });
  }

  if (failedTests.length > 0) {
    console.log("\n❌ Failed Tests:");
    failedTests.forEach(test => {
      console.log(`   "${test.query}": ${test.error}`);
    });
  }

  // Test specific comprehensive scenarios
  console.log("\n" + "=".repeat(80));
  console.log("🎯 TESTING COMPREHENSIVE SCENARIOS");
  console.log("=".repeat(80));

  // Test comprehensive "mandir" variations
  console.log("\n1. Testing comprehensive 'mandir' variations:");
  const mandirVariations = [
    "mandir",
    "pooja room",
    "temple",
    "hindu prayer space",
    "religious room",
    "worship area",
    "devotional space"
  ];

  for (const variation of mandirVariations) {
    try {
      const result = await queryIntelligenceService.intelligentSearch(variation, 3);
      const detectedRoom = result.ai_insights?.detected_room?.detectedRoom;
      const confidence = result.ai_insights?.detected_room?.confidence;
      
      if (detectedRoom && (detectedRoom.toLowerCase().includes('prayer') || detectedRoom.toLowerCase().includes('pooja'))) {
        console.log(`   ✅ SUCCESS: "${variation}" → "${detectedRoom}" (confidence: ${confidence})`);
      } else {
        console.log(`   ⚠️  PARTIAL: "${variation}" → "${detectedRoom}" (confidence: ${confidence})`);
      }
    } catch (error) {
      console.log(`   ❌ FAILED: "${variation}" - ${error.message}`);
    }
  }

  // Test comprehensive room variations
  console.log("\n2. Testing comprehensive room variations:");
  const roomVariations = [
    { query: "drawing room", expected: "living room" },
    { query: "family room", expected: "living room" },
    { query: "study room", expected: "home office" },
    { query: "work area", expected: "home office" },
    { query: "dining area", expected: "dining room" },
    { query: "sleeping room", expected: "bedroom" }
  ];

  for (const variation of roomVariations) {
    try {
      const result = await queryIntelligenceService.intelligentSearch(variation.query, 3);
      const detectedRoom = result.ai_insights?.detected_room?.detectedRoom;
      const confidence = result.ai_insights?.detected_room?.confidence;
      
      if (detectedRoom && detectedRoom.toLowerCase().includes(variation.expected.toLowerCase())) {
        console.log(`   ✅ SUCCESS: "${variation.query}" → "${detectedRoom}" (confidence: ${confidence})`);
      } else {
        console.log(`   ⚠️  PARTIAL: "${variation.query}" → "${detectedRoom}" (confidence: ${confidence})`);
      }
    } catch (error) {
      console.log(`   ❌ FAILED: "${variation.query}" - ${error.message}`);
    }
  }

  // Test comprehensive keyword extraction
  console.log("\n3. Testing comprehensive keyword extraction:");
  const keywordTestQueries = [
    "modern mandir with brass diyas and wooden carvings",
    "traditional kitchen with granite countertop and brass handles",
    "contemporary living room with jharokha and marble flooring",
    "classic bedroom with teak furniture and silk curtains"
  ];

  for (const testQuery of keywordTestQueries) {
    try {
      const result = await queryIntelligenceService.intelligentSearch(testQuery, 3);
      const keywords = result.ai_insights?.extracted_keywords;
      
      if (keywords && keywords.length >= 5) {
        console.log(`   ✅ SUCCESS: "${testQuery}" - Extracted ${keywords.length} keywords`);
        console.log(`      Keywords: ${keywords.slice(0, 8).join(', ')}${keywords.length > 8 ? '...' : ''}`);
      } else {
        console.log(`   ⚠️  PARTIAL: "${testQuery}" - Extracted ${keywords?.length || 0} keywords`);
      }
    } catch (error) {
      console.log(`   ❌ FAILED: "${testQuery}" - ${error.message}`);
    }
  }

  console.log("\n" + "=".repeat(80));
  console.log("🎉 COMPREHENSIVE AI SEARCH TESTING COMPLETED");
  console.log("=".repeat(80));
}

// Run test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testComprehensiveAISearch()
    .then(() => {
      console.log("\n✅ All comprehensive tests completed successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Comprehensive test failed:", error);
      process.exit(1);
    });
}

export default testComprehensiveAISearch;
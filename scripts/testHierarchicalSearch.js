import imageService from "../src/services/imageService.js";
import dotenv from "dotenv";

dotenv.config();

async function testHierarchicalSearch() {
  console.log("🧪 Testing Hierarchical Search Implementation\n");

  const testQueries = [
    {
      name: "Room Type Only",
      query: "living room",
      expected: "Should find all living room images",
    },
    {
      name: "Room Type + Style",
      query: "modern living room",
      expected: "Should find living room images with modern style",
    },
    {
      name: "Room Type + Features",
      query: "living room with sofa",
      expected: "Should find living room images containing sofas",
    },
    {
      name: "Room Type + Style + Features",
      query: "modern indian living room with wooden furniture",
      expected: "Should find modern Indian living rooms with wooden furniture",
    },
    {
      name: "Non-existent Room Type",
      query: "garage modern design",
      expected: "Should return empty if no garage images exist",
    },
    {
      name: "No Room Type (General Search)",
      query: "modern wooden furniture",
      expected: "Should search across all rooms for modern wooden furniture",
    },
  ];

  for (const test of testQueries) {
    console.log(`\n🔍 Test: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    console.log(`Expected: ${test.expected}`);
    console.log("─".repeat(50));

    try {
      const startTime = Date.now();
      const results = await imageService.hierarchicalSearch(test.query, 5);
      const endTime = Date.now();

      console.log(`✅ Results: ${results.images.length} images found`);
      console.log(`⏱️  Time: ${endTime - startTime}ms`);
      console.log(`🎯 Strategy: ${results.search_metadata.search_strategy}`);

      if (results.search_metadata.detected_room_type) {
        console.log(
          `🏠 Detected Room Type: ${results.search_metadata.detected_room_type}`
        );
        console.log(
          `📊 Room Filtering Applied: ${
            results.search_metadata.strict_filtering_applied ? "Yes" : "No"
          }`
        );
      }

      if (results.images.length > 0) {
        console.log(`\n📋 Sample Results:`);
        results.images.slice(0, 3).forEach((image, index) => {
          console.log(
            `  ${index + 1}. Room: ${image.room_type} | Theme: ${
              image.design_theme
            }`
          );
        });
      } else if (results.search_metadata.available_room_types) {
        console.log(
          `\n🏠 Available Room Types: ${results.search_metadata.available_room_types.join(
            ", "
          )}`
        );
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log("\n");
  }

  console.log("🧪 Testing Complete!\n");
}

// Comparison test between hierarchical and legacy search
async function comparisonTest() {
  console.log("🔄 Comparison Test: Hierarchical vs Legacy Search\n");

  const testQuery = "modern indian living room";

  try {
    console.log(`Query: "${testQuery}"`);
    console.log("─".repeat(50));

    // Test hierarchical search
    console.log("\n🏠 Hierarchical Search:");
    const hierarchicalResults = await imageService.hierarchicalSearch(
      testQuery,
      5
    );
    console.log(`Results: ${hierarchicalResults.images.length} images`);
    console.log(
      `Strategy: ${hierarchicalResults.search_metadata.search_strategy}`
    );
    console.log(
      `Room Type Detected: ${
        hierarchicalResults.search_metadata.detected_room_type || "None"
      }`
    );

    // Test legacy search
    console.log("\n🔍 Legacy Search:");
    const legacyResults = await imageService.searchImages(testQuery, 5);
    console.log(`Results: ${legacyResults.images.length} images`);
    console.log(`Strategy: ${legacyResults.search_metadata.search_strategy}`);

    // Compare results
    console.log("\n📊 Comparison:");
    console.log(
      `Hierarchical found: ${hierarchicalResults.images.length} images`
    );
    console.log(`Legacy found: ${legacyResults.images.length} images`);

    if (hierarchicalResults.images.length > 0) {
      console.log(`\n🏠 Hierarchical Results (Room Types):`);
      const roomTypes = hierarchicalResults.images.map((img) => img.room_type);
      const uniqueRoomTypes = [...new Set(roomTypes)];
      console.log(`Room Types: ${uniqueRoomTypes.join(", ")}`);
    }

    if (legacyResults.images.length > 0) {
      console.log(`\n🔍 Legacy Results (Room Types):`);
      const roomTypes = legacyResults.images.map((img) => img.room_type);
      const uniqueRoomTypes = [...new Set(roomTypes)];
      console.log(`Room Types: ${uniqueRoomTypes.join(", ")}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

// Room type detection test
async function roomTypeDetectionTest() {
  console.log("\n🎯 Room Type Detection Test\n");

  const testQueries = [
    "living room modern design",
    "bedroom with wardrobe",
    "kitchen island marble",
    "bathroom vanity mirror",
    "dining room table",
    "office workspace",
    "modern furniture", // No room type
    "indian traditional style", // No room type
  ];

  for (const query of testQueries) {
    try {
      console.log(`Query: "${query}"`);
      const detectedRoomType = await imageService.detectRoomTypeFromQuery(
        query
      );
      console.log(`Detected Room Type: ${detectedRoomType || "None"}\n`);
    } catch (error) {
      console.log(`Error: ${error.message}\n`);
    }
  }
}

// Run all tests
async function runAllTests() {
  try {
    await testHierarchicalSearch();
    await comparisonTest();
    await roomTypeDetectionTest();

    console.log("🎉 All tests completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  } finally {
    process.exit(0);
  }
}

// Run the tests
runAllTests();

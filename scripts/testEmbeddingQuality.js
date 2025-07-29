import embeddingService from "../src/services/embeddingService.js";

async function testEmbeddingQuality() {
  console.log("🧪 Testing Enhanced Embedding Quality...\n");

  // Sample AI analysis data
  const sampleAnalysis = {
    room: "living room",
    theme: "modern indian",
    primary_features: ["modular furniture", "open layout", "natural lighting"],
    objects: [
      {
        type: "sofa",
        features: ["leather upholstery", "contemporary design"],
        materials: ["fabric", "wooden frame"],
        finish: "matte",
      },
      {
        type: "coffee table",
        features: ["glass top", "metal legs"],
        materials: ["glass", "stainless steel"],
        finish: "glossy",
      },
    ],
    visual_attributes: {
      colors: ["beige", "brown", "white"],
      materials: ["leather", "glass", "metal"],
      lighting: "natural daylight",
      texture: "smooth",
    },
    indian_context: {
      regional_style: "south indian",
      traditional_elements: ["brass diyas", "wooden carvings"],
      modern_adaptations: ["contemporary sofa with traditional elements"],
      space_utilization: "open plan",
      cultural_significance: "blend of traditional and modern indian design",
    },
  };

  const description =
    "A contemporary living room that beautifully combines modern furniture with traditional Indian design elements. The space features a leather sofa with brass accent pieces and natural lighting that highlights the warm color palette.";
  const metadata = {
    budget_indicator: "premium",
    space_type: "2BHK",
    functionality: "entertainment",
  };

  try {
    console.log("📝 Sample AI Analysis:");
    console.log(JSON.stringify(sampleAnalysis, null, 2));
    console.log("\n📄 Description:", description);
    console.log("\n🏷️ Metadata:", JSON.stringify(metadata, null, 2));
    console.log("\n" + "=".repeat(60));

    // Generate embeddings
    const multiVectors = await embeddingService.createMultiVectors(
      sampleAnalysis,
      description,
      metadata,
      "test_image_001"
    );

    console.log("\n✅ Generated Embedding Texts:");
    console.log("\n🔍 Primary Search Vector:");
    console.log(multiVectors.embedding_texts.primary_search);

    console.log("\n🔍 Semantic Description Vector:");
    console.log(multiVectors.embedding_texts.semantic_desc);

    console.log("\n🔍 Object Focus Vector:");
    console.log(multiVectors.embedding_texts.object_focus);

    console.log("\n" + "=".repeat(60));
    console.log("📊 Vector Dimensions:");
    console.log(
      `Primary Search: ${multiVectors.primary_search.length} dimensions`
    );
    console.log(
      `Semantic Desc: ${multiVectors.semantic_desc.length} dimensions`
    );
    console.log(`Object Focus: ${multiVectors.object_focus.length} dimensions`);

    console.log("\n🎉 Test completed successfully!");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

// Run the test
testEmbeddingQuality();

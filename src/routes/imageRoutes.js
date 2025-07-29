import express from "express";
const router = express.Router();
import imageController from "../controllers/imageController.js";
import imageService from "../services/imageService.js";

// GET /api/images - Get all images from CSV
router.get("/", imageController.getAllImages);

// GET /api/images/search - Search images using vector similarity in QdrantDB
router.get("/search", imageController.searchImages);

// Simple search route without AI enhancement for testing
router.get("/simple-search", async (req, res) => {
  try {
    const { query = "bedroom", limit = 5 } = req.query;

    // Import services
    const qdrantService = await import("../services/qdrantService.js");

    // Get embedding for query
    const queryVector = await qdrantService.default.getEmbedding(query);

    // Simple search on primary_search vector only
    const searchResults = await qdrantService.default.client.search(
      "interior_images",
      {
        vector: { name: "primary_search", vector: queryVector },
        limit: parseInt(limit),
        with_payload: true,
        with_vector: false,
      }
    );

    // Format results
    const formattedResults = searchResults.map((result) => ({
      image_id: result.payload.image_id,
      image_url: result.payload.image_url,
      score: result.score,
      room_type: result.payload.room_type,
      design_theme: result.payload.design_theme,
    }));

    res.json({
      success: true,
      data: formattedResults,
      query: query,
      message: `Found ${formattedResults.length} matching images`,
      mode: "simple_search",
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      stack: error.stack,
    });
  }
});

// Debug route to test search components
router.get("/debug-search", async (req, res) => {
  try {
    const { query = "bedroom" } = req.query;

    // Test each component step by step
    const testResults = {
      step1_query: query,
      step2_qdrant_service: null,
      step3_search_result: null,
      step4_error: null,
    };

    try {
      // Test qdrant service import
      const qdrantService = await import("../services/qdrantService.js");
      testResults.step2_qdrant_service = "✅ Imported successfully";

      // Test simple embedding
      const embedding = await qdrantService.default.getEmbedding("test");
      testResults.step2_qdrant_service += " | ✅ Embedding works";

      // Test basic search (bypass AI enhancement)
      const simpleSearchResult = await qdrantService.default.client.search(
        "interior_images",
        {
          vector: { name: "primary_search", vector: embedding },
          limit: 3,
          with_payload: true,
          with_vector: false,
        }
      );

      testResults.step3_search_result = `✅ Found ${simpleSearchResult.length} results`;
    } catch (error) {
      testResults.step4_error = error.message;
    }

    res.json({
      success: true,
      debug_results: testResults,
    });
  } catch (error) {
    res.json({
      success: false,
      debug_error: error.message,
      stack: error.stack,
    });
  }
});

// Test hierarchical search step by step
router.get("/test-hierarchical", async (req, res) => {
  try {
    const { query = "Modern Indian Dining Room with Mirror Wall Panel" } =
      req.query;

    const testResults = {
      step1_query: query,
      step2_ai_room_detection: null,
      step3_ai_keywords: null,
      step4_search_results: null,
      step5_hierarchical: null,
      step6_enhancement: null,
      error: null,
    };

    try {
      // Step 2: Test AI room detection
      const queryIntelligenceService = await import(
        "../services/queryIntelligenceService.js"
      );
      const aiRoomDetection =
        await queryIntelligenceService.default.aiDetectRoomType(query);
      testResults.step2_ai_room_detection = `✅ ${
        aiRoomDetection?.detectedRoom || "none"
      } (confidence: ${aiRoomDetection?.confidence || 0})`;

      // Step 3: Test AI keywords
      const aiKeywords =
        await queryIntelligenceService.default.aiExtractKeywords(query);
      testResults.step3_ai_keywords = `✅ ${
        aiKeywords.length
      } keywords: ${aiKeywords.join(", ")}`;

      // Step 4: Test search
      const qdrantService = await import("../services/qdrantService.js");
      const enhancedFilters =
        queryIntelligenceService.default.buildEnhancedFilters(
          {},
          aiRoomDetection,
          aiKeywords
        );
      const searchResponse = await qdrantService.default.search(
        query,
        10,
        enhancedFilters
      );
      testResults.step4_search_results = `✅ Found ${
        searchResponse.results?.length || 0
      } results`;

      // Step 5: Test hierarchical filtration
      const imageService = await import("../services/imageService.js");
      const queryAnalysis = await imageService.default.analyzeQueryWithIntent(
        query,
        aiRoomDetection,
        aiKeywords
      );
      const hierarchicalResults =
        await imageService.default.applyCompleteHierarchicalFiltration(
          searchResponse.results || [],
          queryAnalysis,
          10
        );
      testResults.step5_hierarchical = `✅ Hierarchical filtration complete: ${hierarchicalResults.length} results`;

      // Step 6: Test enhancement
      const enhancedResponse =
        await queryIntelligenceService.default.aiEnhanceResults(
          { results: hierarchicalResults },
          query,
          aiRoomDetection,
          aiKeywords
        );
      testResults.step6_enhancement = `✅ Enhancement complete: ${
        enhancedResponse.results?.length || 0
      } results`;
    } catch (error) {
      testResults.error = error.message;
      console.error("Test error:", error);
    }

    res.json({
      success: true,
      test_results: testResults,
    });
  } catch (error) {
    res.json({
      success: false,
      test_error: error.message,
      stack: error.stack,
    });
  }
});

// GET /api/images/query-insights - Get query intelligence insights
router.get("/query-insights", async (req, res) => {
  try {
    const insights = await imageService.getQueryInsights();
    res.json({
      success: true,
      data: insights,
      message: "Query intelligence insights retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get query insights",
      message: error.message,
    });
  }
});

export default router;

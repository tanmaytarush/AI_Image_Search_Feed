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
      mode: "simple_search"
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.message,
      stack: error.stack
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
      step4_error: null
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
      debug_results: testResults
    });
  } catch (error) {
    res.json({
      success: false,
      debug_error: error.message,
      stack: error.stack
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
      message: "Query intelligence insights retrieved successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to get query insights",
      message: error.message
    });
  }
});

export default router;

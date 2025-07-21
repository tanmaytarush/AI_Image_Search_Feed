import express from "express";
const router = express.Router();

// Import route modules
import imageRoutes from "./imageRoutes.js";
import cdnRoutes from "./cdnRoutes.js";

// Mount routes
router.use("/images", imageRoutes);
router.use("/cdn", cdnRoutes);

// API info endpoint
router.get("/", (req, res) => {
  res.json({
    message: "Interior Image Embedding API", version: "1.0.0", description: "Enhanced API for image listing and comprehensive search",
    endpoints: {
      "GET /api/images": "Get all images from CSV",
      "GET /api/images/search": "Enhanced search across all AI-generated tags and attributes",
      "GET /api/images/query-insights": "Get query intelligence insights",
      "GET /api/cdn/stats": "Get CDN cache statistics",
      "DELETE /api/cdn/expired": "Clear expired cache entries",
      "DELETE /api/cdn/all": "Clear all cache",
      "GET /api/cdn/check/:imageId": "Check CDN status for specific image",
    },
    queryParameters: {
      "GET /api/images/search": { query: "Search query (required) - searches across all tags", limit: "Number of results (default: 10)" },
      "GET /api/cdn/check/:imageId": { imageUrl: "Image URL to check (required)" },
    },
    examples: {
      "Get all images": "GET /api/images",
      "Search for modern living rooms": "GET /api/images/search?query=modern living room&limit=5",
      "Search for glass panels": "GET /api/images/search?query=glass panels&limit=5",
      "Get CDN stats": "GET /api/cdn/stats",
      "Check CDN status": "GET /api/cdn/check/123?imageUrl=https://example.com/image.jpg",
    },
    features: {
      "Enhanced Search": "Searches across all AI-generated tags, materials, colors, features, and attributes",
      "Comprehensive Matching": "Matches query words against room types, design themes, materials, colors, objects, and cultural elements",
      "Intelligent Ranking": "Ranks results by tag match score and vector similarity",
      "CDN Integration": "Caches analysis results and optimizes image URLs",
      "Query Intelligence": "Dynamic room type detection and learning capabilities"
    }
  });
});

export default router;

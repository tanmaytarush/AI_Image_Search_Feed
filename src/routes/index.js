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
    message: "Interior Image Embedding API",
    version: "1.0.0",
    description: "Simple API for image listing and search",
    endpoints: {
      "GET /api/images": "Get all images from CSV",
      "GET /api/images/search": "Search images using vector similarity in QdrantDB",
      "GET /api/images/query-insights": "Get query intelligence insights",
      "GET /api/cdn/stats": "Get CDN cache statistics",
      "DELETE /api/cdn/expired": "Clear expired cache entries",
      "DELETE /api/cdn/all": "Clear all cache",
      "GET /api/cdn/check/:imageId": "Check CDN status for specific image",
    },
    queryParameters: {
      "GET /api/images/search": {
        query: "Search query (required)",
        limit: "Number of results (default: 10)",
      },
      "GET /api/cdn/check/:imageId": {
        imageUrl: "Image URL to check (required)",
      },
    },
    examples: {
      "Get all images": "GET /api/images",
      "Search for modern living rooms": "GET /api/images/search?query=modern living room&limit=5",
      "Get CDN stats": "GET /api/cdn/stats",
      "Check CDN status": "GET /api/cdn/check/123?imageUrl=https://example.com/image.jpg",
    },
  });
});

export default router;

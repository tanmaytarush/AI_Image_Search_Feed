import express from "express";
import cdnService from "../services/cdnService.js";

const router = express.Router();

/**
 * Get CDN cache statistics
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = cdnService.getCacheStats();
    res.status(200).json({
      success: true,
      data: stats,
      message: "CDN cache statistics retrieved successfully"
    });
  } catch (error) {
    console.error("Error getting CDN stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get CDN cache statistics"
    });
  }
});

/**
 * Clear expired cache entries
 */
router.delete("/expired", async (req, res) => {
  try {
    const clearedCount = await cdnService.clearExpiredCache();
    res.status(200).json({
      success: true,
      data: { cleared_count: clearedCount },
      message: `Cleared ${clearedCount} expired cache entries`
    });
  } catch (error) {
    console.error("Error clearing expired cache:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear expired cache"
    });
  }
});

/**
 * Clear all cache
 */
router.delete("/all", async (req, res) => {
  try {
    const result = await cdnService.clearAllCache();
    res.status(200).json({
      success: true,
      data: result,
      message: "All cache cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing all cache:", error);
    res.status(500).json({
      success: false,
      error: "Failed to clear all cache"
    });
  }
});

/**
 * Check if specific image is optimized in CDN
 */
router.get("/check/:imageId", async (req, res) => {
  try {
    const { imageId } = req.params;
    const { imageUrl } = req.query;
    
    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        error: "imageUrl query parameter is required"
      });
    }
    
    const isOptimized = await cdnService.isImageOptimized(imageUrl);
    const cachedAnalysis = await cdnService.getCachedAnalysis(imageUrl);
    
    res.status(200).json({
      success: true,
      data: {
        image_id: imageId,
        image_url: imageUrl,
        is_optimized: isOptimized,
        has_cached_analysis: cachedAnalysis !== null,
        cdn_url: await cdnService.getCDNUrl(imageUrl)
      },
      message: "CDN status checked successfully"
    });
  } catch (error) {
    console.error("Error checking CDN status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check CDN status"
    });
  }
});

export default router; 
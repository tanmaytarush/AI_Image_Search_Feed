import imageService from "../services/imageService.js";

class ImageController {
  /**
   * Get all images from CSV
   */
  async getAllImages(req, res, next) {
    try {
      const images = await imageService.getAllImages();
      res
        .status(200)
        .json({
          success: true,
          data: images,
          message: "Images retrieved successfully",
        });
    } catch (error) {
      console.error("Error in getAllImages controller:", error);
      next(error);
    }
  }

  /**
   * Enhanced search images across all AI-generated tags
   */
  async searchImages(req, res, next) {
    try {
      const { query, limit = 100 } = req.query;
      if (!query || query.trim().length === 0) {
        return res
          .status(400)
          .json({
            success: false,
            error: "Search query is required",
            message: "Please provide a search query",
          });
      }

      const searchResults = await imageService.searchImages(
        query.trim(),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: searchResults.images,
        query: query.trim(),
        message: searchResults.message,
        search_metadata: searchResults.search_metadata,
      });
    } catch (error) {
      console.error("Error in searchImages controller:", error);
      next(error);
    }
  }
}

export default new ImageController();

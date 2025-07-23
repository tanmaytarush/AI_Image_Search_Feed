import imageService from "../services/imageService.js";

class ImageController {
  /**
   * Get all images from CSV
   */
  async getAllImages(req, res, next) {
    try {
      const images = await imageService.getAllImages();
      res.status(200).json({
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
   * HIERARCHICAL SEARCH - Room type first, then features, style, objects
   * This is now the default search method that prioritizes room type filtering
   */
  async searchImages(req, res, next) {
    try {
      const { query, limit = 10, search_type = "hierarchical" } = req.query;
      if (!query || query.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Search query is required",
          message: "Please provide a search query",
        });
      }

      console.log(`🔍 API Search Request:`);
      console.log(`  Query: "${query}"`);
      console.log(`  Search Type: "${search_type}"`);
      console.log(`  Limit: ${limit}`);

      let searchResults;

      if (search_type === "hierarchical") {
        console.log(`🏠 Using Hierarchical Search`);
        // Use new hierarchical search (default)
        try {
          searchResults = await imageService.hierarchicalSearch(
            query.trim(),
            parseInt(limit)
          );
          console.log(`✅ Hierarchical search completed successfully`);
        } catch (hierarchicalError) {
          console.error(
            `❌ Hierarchical search failed:`,
            hierarchicalError.message
          );
          console.log(`🔄 Falling back to legacy search`);
          searchResults = await imageService.searchImages(
            query.trim(),
            parseInt(limit)
          );
        }
      } else if (search_type === "legacy") {
        console.log(`🔍 Using Legacy Search`);
        // Fallback to old enhanced search
        searchResults = await imageService.searchImages(
          query.trim(),
          parseInt(limit)
        );
      } else {
        console.log(
          `🏠 Using Hierarchical Search (default for unrecognized type)`
        );
        // Default to hierarchical if unrecognized search_type
        try {
          searchResults = await imageService.hierarchicalSearch(
            query.trim(),
            parseInt(limit)
          );
        } catch (hierarchicalError) {
          console.error(
            `❌ Hierarchical search failed:`,
            hierarchicalError.message
          );
          console.log(`🔄 Falling back to legacy search`);
          searchResults = await imageService.searchImages(
            query.trim(),
            parseInt(limit)
          );
        }
      }

      console.log(
        `📊 Final search strategy: ${searchResults.search_metadata.search_strategy}`
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

  /**
   * Enhanced search images across all AI-generated tags (legacy method)
   * Available via search_type=legacy parameter
   */
  async legacySearchImages(req, res, next) {
    try {
      const { query, limit = 10 } = req.query;
      if (!query || query.trim().length === 0) {
        return res.status(400).json({
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
      console.error("Error in legacySearchImages controller:", error);
      next(error);
    }
  }

  /**
   * Generate query summary for insights
   */
  async generateQuerySummary(req, res, next) {
    try {
      const insights = await imageService.getQueryInsights();
      res.status(200).json({
        success: true,
        data: insights,
        message: "Query insights generated successfully",
      });
    } catch (error) {
      console.error("Error in generateQuerySummary controller:", error);
      next(error);
    }
  }
}

export default new ImageController();

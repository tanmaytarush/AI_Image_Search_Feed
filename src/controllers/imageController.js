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
      next(error);
    }
  }

  /**
   * Search images using AI-enhanced vector similarity in QdrantDB
   */
  async searchImages(req, res, next) {
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

      // Extract images and intelligence data
      const { images, search_intelligence } = searchResults;

      // Generate query summary if intelligence data is available
      let queryUnderstanding = "Basic search completed";
      if (search_intelligence && search_intelligence.search_intent) {
        queryUnderstanding = this.generateQuerySummary(search_intelligence);
      }

      res.status(200).json({
        success: true,
        data: images,
        query: query.trim(),
        message: `Found ${images.length} matching images`,
        search_intelligence: search_intelligence ? {
          ...search_intelligence,
          query_understanding: queryUnderstanding
        } : {
          original_query: query.trim(),
          enhancement_used: false,
          query_understanding: queryUnderstanding
        }
      });
    } catch (error) {
      console.error("Error in searchImages controller:", error);
      next(error);
    }
  }

  /**
   * Generate user-friendly summary of query understanding
   */
  generateQuerySummary(intelligence) {
    const { search_intent, detected_elements, enhancement_confidence } = intelligence;
    
    let summary = `Search intent: ${search_intent || 'general'}`;
    
    if (detected_elements) {
      const elements = [];
      if (detected_elements.room_type) elements.push(`Room: ${detected_elements.room_type}`);
      if (detected_elements.design_theme) elements.push(`Style: ${detected_elements.design_theme}`);
      if (detected_elements.objects && detected_elements.objects.length > 0) {
        elements.push(`Objects: ${detected_elements.objects.slice(0, 2).join(', ')}`);
      }
      
      if (elements.length > 0) {
        summary += ` | Detected: ${elements.join(' | ')}`;
      }
    }
    
    const confidenceLevel = enhancement_confidence > 0.7 ? 'High' : 
                           enhancement_confidence > 0.5 ? 'Medium' : 'Low';
    summary += ` | Confidence: ${confidenceLevel}`;
    
    return summary;
  }
}

export default new ImageController();

import qdrantService from "./qdrantService.js";
import queryIntelligenceService from "./queryIntelligenceService.js";
import fs from "fs";
import csv from "csv-parser";

class ImageService {
  constructor() {
    this.csvFilePath = "./src/data/interior-image-urls.csv";
  }

  async getAllImages() {
    try {
      const results = await qdrantService.client.scroll("interior_images", {
        limit: 100,
        with_payload: true,
        with_vector: false,
      });
      return results.points.map((point) => ({
        image_id: point.id,
        image_url: point.payload.image_url,
        ...point.payload,
      }));
    } catch (error) {
      console.error("Error getting all images:", error);
      throw new Error("Failed to get images");
    }
  }

  async getQueryInsights() {
    return queryIntelligenceService.getQueryInsights();
  }

  /**
   * Enhanced search that searches across all AI-generated tags and attributes
   * This replaces the old searchImages method
   */
  async searchImages(query, limit = 10) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error("Search query is required");
      }

      console.log(`🔍 Enhanced search for: "${query}"`);
      
      // Get vector embedding for semantic search
      const queryVector = await qdrantService.getEmbedding(query.trim());
      
      // Perform initial vector search with larger limit for filtering
      const searchResults = await qdrantService.client.search(
        "interior_images",
        { 
          vector: { name: "primary_search", vector: queryVector }, 
          limit: parseInt(limit) * 5, 
          with_payload: true, 
          with_vector: false 
        }
      );

      console.log(`📊 Raw search results: ${searchResults.length}`);

      // Filter results based on comprehensive tag matching
      const filteredResults = this.filterByAllTags(searchResults, query);
      
      // Sort by relevance (tag match score + vector similarity)
      const sortedResults = this.sortByRelevance(filteredResults, query);
      
      // Limit results
      const limitedResults = sortedResults.slice(0, parseInt(limit));

      console.log(`✅ Filtered to ${limitedResults.length} relevant results`);

      return {
        success: true,
        images: limitedResults.map(result => this.formatEnhancedResult(result)),
        query: query,
        message: `Found ${limitedResults.length} matching images`,
        search_metadata: {
          total_searched: searchResults.length,
          total_filtered: limitedResults.length,
          search_strategy: "enhanced_comprehensive_search",
          matched_fields: this.getMatchedFields(query, limitedResults)
        }
      };
    } catch (error) {
      console.error("Enhanced search error:", error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Filter results by checking if query words match any tag in comprehensive list
   */
  filterByAllTags(searchResults, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

    return searchResults.filter(result => {
      const payload = result.payload;
      return this.checkTagMatch(payload, queryWords, queryLower);
    });
  }

  /**
   * Check if any query word matches any tag in the payload
   */
  checkTagMatch(payload, queryWords, queryLower) {
    // Check exact phrase match first
    if (queryLower.includes(payload.room_type?.toLowerCase()) ||
        queryLower.includes(payload.design_theme?.toLowerCase()) ||
        queryLower.includes(payload.budget_category?.toLowerCase()) ||
        queryLower.includes(payload.space_type?.toLowerCase())) {
      return true;
    }

    // Check all tag fields comprehensively
    const tagFields = [
      payload.room_type,
      payload.design_theme,
      payload.budget_category,
      payload.space_type,
      ...(payload.tags?.colors || []),
      ...(payload.tags?.materials || []),
      ...(payload.tags?.primary_features || []),
      ...(payload.tags?.object_types || []),
      payload.tags?.functionality,
      payload.tags?.regional_style,
      ...(payload.indian_context?.traditional_elements || []),
      ...(payload.indian_context?.modern_adaptations || []),
      payload.indian_context?.cultural_significance,
      
      // Check ai_generated_tags structure comprehensively
      payload.ai_generated_tags?.room,
      payload.ai_generated_tags?.theme,
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
      ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
      ...(payload.ai_generated_tags?.objects?.map(obj => obj.type) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(obj => obj.materials || []) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(obj => obj.features || []) || []),
      ...(payload.ai_generated_tags?.indian_context?.traditional_elements || []),
      ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),
      payload.ai_generated_tags?.indian_context?.cultural_significance,
      ...(payload.ai_generated_tags?.metadata?.tags || []),
      
      // Check original_analysis structure if it exists
      payload.original_analysis?.ai_generated_tags?.room,
      payload.original_analysis?.ai_generated_tags?.theme,
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(obj => obj.type) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(obj => obj.materials || []) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(obj => obj.features || []) || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context?.traditional_elements || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context?.modern_adaptations || []),
      payload.original_analysis?.ai_generated_tags?.indian_context?.cultural_significance,
      ...(payload.original_analysis?.ai_generated_tags?.metadata?.tags || []),
      
      // Check search_tags if available
      ...(payload.search_tags || [])
    ].filter(Boolean);

    // Check if any query word matches any tag
    return queryWords.some(queryWord => 
      tagFields.some(tag => 
        tag.toLowerCase().includes(queryWord) || 
        queryWord.includes(tag.toLowerCase())
      )
    );
  }

  /**
   * Calculate tag match score based on matched fields and their importance
   */
  calculateTagMatchScore(payload, queryWords, queryLower) {
    let score = 0;
    const weights = {
      room_type: 10,
      design_theme: 8,
      primary_features: 7,
      materials: 6,
      colors: 5,
      object_types: 6,
      functionality: 4,
      regional_style: 4,
      traditional_elements: 3,
      modern_adaptations: 3,
      cultural_significance: 3
    };

    // Check exact matches with higher weight
    if (queryLower.includes(payload.room_type?.toLowerCase())) score += weights.room_type;
    if (queryLower.includes(payload.design_theme?.toLowerCase())) score += weights.design_theme;

    // Check comprehensive tag matches from all structures
    const allTags = [
      // Basic tags
      ...(payload.tags?.colors || []),
      ...(payload.tags?.materials || []),
      ...(payload.tags?.primary_features || []),
      ...(payload.tags?.object_types || []),
      payload.tags?.functionality,
      payload.tags?.regional_style,
      ...(payload.indian_context?.traditional_elements || []),
      ...(payload.indian_context?.modern_adaptations || []),
      payload.indian_context?.cultural_significance,
      
      // ai_generated_tags structure
      payload.ai_generated_tags?.room,
      payload.ai_generated_tags?.theme,
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
      ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
      ...(payload.ai_generated_tags?.objects?.map(obj => obj.type) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(obj => obj.materials || []) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(obj => obj.features || []) || []),
      ...(payload.ai_generated_tags?.indian_context?.traditional_elements || []),
      ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),
      payload.ai_generated_tags?.indian_context?.cultural_significance,
      ...(payload.ai_generated_tags?.metadata?.tags || []),
      
      // original_analysis structure
      payload.original_analysis?.ai_generated_tags?.room,
      payload.original_analysis?.ai_generated_tags?.theme,
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(obj => obj.type) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(obj => obj.materials || []) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(obj => obj.features || []) || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context?.traditional_elements || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context?.modern_adaptations || []),
      payload.original_analysis?.ai_generated_tags?.indian_context?.cultural_significance,
      ...(payload.original_analysis?.ai_generated_tags?.metadata?.tags || []),
      
      // search_tags
      ...(payload.search_tags || [])
    ].filter(Boolean);

    queryWords.forEach(queryWord => {
      allTags.forEach(tag => {
        if (tag.toLowerCase().includes(queryWord) || queryWord.includes(tag.toLowerCase())) {
          // Assign weight based on field type
          if (payload.tags?.primary_features?.includes(tag) || 
              payload.ai_generated_tags?.primary_features?.includes(tag) ||
              payload.original_analysis?.ai_generated_tags?.primary_features?.includes(tag)) {
            score += weights.primary_features;
          }
          else if (payload.tags?.materials?.includes(tag) || 
                   payload.ai_generated_tags?.visual_attributes?.materials?.includes(tag) ||
                   payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials?.includes(tag)) {
            score += weights.materials;
          }
          else if (payload.tags?.colors?.includes(tag) || 
                   payload.ai_generated_tags?.visual_attributes?.colors?.includes(tag) ||
                   payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors?.includes(tag)) {
            score += weights.colors;
          }
          else if (payload.tags?.object_types?.includes(tag) || 
                   payload.ai_generated_tags?.objects?.some(obj => obj.type === tag) ||
                   payload.original_analysis?.ai_generated_tags?.objects?.some(obj => obj.type === tag)) {
            score += weights.object_types;
          }
          else if (payload.tags?.functionality === tag || 
                   payload.ai_generated_tags?.metadata?.functionality === tag ||
                   payload.original_analysis?.ai_generated_tags?.metadata?.functionality === tag) {
            score += weights.functionality;
          }
          else if (payload.tags?.regional_style === tag || 
                   payload.ai_generated_tags?.indian_context?.regional_style === tag ||
                   payload.original_analysis?.ai_generated_tags?.indian_context?.regional_style === tag) {
            score += weights.regional_style;
          }
          else if (payload.indian_context?.traditional_elements?.includes(tag) || 
                   payload.ai_generated_tags?.indian_context?.traditional_elements?.includes(tag) ||
                   payload.original_analysis?.ai_generated_tags?.indian_context?.traditional_elements?.includes(tag)) {
            score += weights.traditional_elements;
          }
          else if (payload.indian_context?.modern_adaptations?.includes(tag) || 
                   payload.ai_generated_tags?.indian_context?.modern_adaptations?.includes(tag) ||
                   payload.original_analysis?.ai_generated_tags?.indian_context?.modern_adaptations?.includes(tag)) {
            score += weights.modern_adaptations;
          }
          else if (payload.indian_context?.cultural_significance === tag || 
                   payload.ai_generated_tags?.indian_context?.cultural_significance === tag ||
                   payload.original_analysis?.ai_generated_tags?.indian_context?.cultural_significance === tag) {
            score += weights.cultural_significance;
          }
          else if (payload.search_tags?.includes(tag)) {
            score += 3; // Medium weight for search tags
          }
          else {
            score += 2; // Default weight for other matches
          }
        }
      });
    });

    return score;
  }

  /**
   * Sort results by tag match score first, then vector similarity
   */
  sortByRelevance(results, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

    return results.sort((a, b) => {
      const scoreA = this.calculateTagMatchScore(a.payload, queryWords, queryLower);
      const scoreB = this.calculateTagMatchScore(b.payload, queryWords, queryLower);
      
      // Primary sort by tag match score
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }
      
      // Secondary sort by vector similarity
      return b.score - a.score;
    });
  }

  /**
   * Format result with enhanced information
   */
  formatEnhancedResult(result) {
    const payload = result.payload;
    
    // Consolidate room_type, design_theme, etc. from all structures
    const consolidatedResult = {
      image_id: result.id,
      image_url: payload.image_url,
      score: result.score,
      tag_match_score: this.calculateTagMatchScore(payload, [], ""),
      room_type: payload.ai_generated_tags?.room || payload.original_analysis?.ai_generated_tags?.room || payload.room_type,
      design_theme: payload.ai_generated_tags?.theme || payload.original_analysis?.ai_generated_tags?.theme || payload.design_theme,
      budget_category: payload.budget_category,
      space_type: payload.space_type,
      tags: {
        ...payload.tags,
        // Merge with ai_generated_tags if available
        colors: [
          ...(payload.tags?.colors || []),
          ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
          ...(payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors || [])
        ],
        materials: [
          ...(payload.tags?.materials || []),
          ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
          ...(payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials || [])
        ],
        primary_features: [
          ...(payload.tags?.primary_features || []),
          ...(payload.ai_generated_tags?.primary_features || []),
          ...(payload.original_analysis?.ai_generated_tags?.primary_features || [])
        ],
        object_types: [
          ...(payload.tags?.object_types || []),
          ...(payload.ai_generated_tags?.objects?.map(obj => obj.type) || []),
          ...(payload.original_analysis?.ai_generated_tags?.objects?.map(obj => obj.type) || [])
        ],
        // Add object features and materials
        object_features: [
          ...(payload.ai_generated_tags?.objects?.flatMap(obj => obj.features || []) || []),
          ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(obj => obj.features || []) || [])
        ],
        object_materials: [
          ...(payload.ai_generated_tags?.objects?.flatMap(obj => obj.materials || []) || []),
          ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(obj => obj.materials || []) || [])
        ]
      },
      indian_context: {
        ...payload.indian_context,
        ...(payload.ai_generated_tags?.indian_context && {
          traditional_elements: [
            ...(payload.indian_context?.traditional_elements || []),
            ...(payload.ai_generated_tags.indian_context.traditional_elements || [])
          ],
          modern_adaptations: [
            ...(payload.indian_context?.modern_adaptations || []),
            ...(payload.ai_generated_tags.indian_context.modern_adaptations || [])
          ],
          cultural_significance: payload.ai_generated_tags.indian_context.cultural_significance || payload.indian_context?.cultural_significance
        }),
        ...(payload.original_analysis?.ai_generated_tags?.indian_context && {
          traditional_elements: [
            ...(payload.indian_context?.traditional_elements || []),
            ...(payload.original_analysis.ai_generated_tags.indian_context.traditional_elements || [])
          ],
          modern_adaptations: [
            ...(payload.indian_context?.modern_adaptations || []),
            ...(payload.original_analysis.ai_generated_tags.indian_context.modern_adaptations || [])
          ],
          cultural_significance: payload.original_analysis.ai_generated_tags.indian_context.cultural_significance || payload.indian_context?.cultural_significance
        })
      },
      confidence_scores: payload.confidence_scores || payload.ai_generated_tags?.confidence_scores || payload.original_analysis?.ai_generated_tags?.confidence_scores,
      // Add search tags for comprehensive search
      search_tags: payload.search_tags || []
    };

    return consolidatedResult;
  }

  /**
   * Get matched fields for search metadata
   */
  getMatchedFields(query, results) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
    
    return results.map(result => {
      const payload = result.payload;
      const matchedFields = [];
      
      // Check all possible fields for matches
      const allFields = {
        room_type: payload.room_type,
        design_theme: payload.design_theme,
        primary_features: payload.tags?.primary_features,
        materials: payload.tags?.materials,
        colors: payload.tags?.colors,
        object_types: payload.tags?.object_types,
        ai_primary_features: payload.ai_generated_tags?.primary_features,
        ai_materials: payload.ai_generated_tags?.visual_attributes?.materials,
        ai_colors: payload.ai_generated_tags?.visual_attributes?.colors,
        ai_objects: payload.ai_generated_tags?.objects?.map(obj => obj.type)
      };

      Object.entries(allFields).forEach(([field, values]) => {
        if (values) {
          const valueArray = Array.isArray(values) ? values : [values];
          valueArray.forEach(value => {
            queryWords.forEach(queryWord => {
              if (value.toLowerCase().includes(queryWord) || queryWord.includes(value.toLowerCase())) {
                matchedFields.push({ field, value });
              }
            });
          });
        }
      });

      return {
        image_id: result.id,
        matched_fields: matchedFields
      };
    });
  }

  // Private helper methods
  async readCSVFile() {
    return new Promise((resolve, reject) => {
      const results = [];
      fs.createReadStream(this.csvFilePath)
        .pipe(csv())
        .on("data", (data) => results.push(data))
        .on("end", () => resolve(results))
        .on("error", reject);
    });
  }

  parseCSVData(csvData) {
    return csvData.map((row) => ({
      image_id: row.image_id,
      image_url: row.image_url,
    }));
  }
}

export default new ImageService();

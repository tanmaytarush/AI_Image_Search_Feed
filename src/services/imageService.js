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
          with_vector: false,
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
        images: limitedResults.map((result) =>
          this.formatEnhancedResult(result)
        ),
        query: query,
        message: `Found ${limitedResults.length} matching images`,
        search_metadata: {
          total_searched: searchResults.length,
          total_filtered: limitedResults.length,
          search_strategy: "enhanced_comprehensive_search",
          matched_fields: this.getMatchedFields(query, limitedResults),
        },
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
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    return searchResults.filter((result) => {
      const payload = result.payload;
      return this.checkTagMatch(payload, queryWords, queryLower);
    });
  }

  /**
   * Check if any query word matches any tag in the payload
   */
  checkTagMatch(payload, queryWords, queryLower) {
    // Check exact phrase match first
    if (
      queryLower.includes(payload.room_type?.toLowerCase()) ||
      queryLower.includes(payload.design_theme?.toLowerCase()) ||
      queryLower.includes(payload.budget_category?.toLowerCase()) ||
      queryLower.includes(payload.space_type?.toLowerCase())
    ) {
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
      ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.materials || []
      ) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.ai_generated_tags?.indian_context?.traditional_elements ||
        []),
      ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),
      payload.ai_generated_tags?.indian_context?.cultural_significance,
      ...(payload.ai_generated_tags?.metadata?.tags || []),

      // Check original_analysis structure if it exists
      payload.original_analysis?.ai_generated_tags?.room,
      payload.original_analysis?.ai_generated_tags?.theme,
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
        ?.colors || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
        ?.materials || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
        (obj) => obj.type
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.materials || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context
        ?.traditional_elements || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context
        ?.modern_adaptations || []),
      payload.original_analysis?.ai_generated_tags?.indian_context
        ?.cultural_significance,
      ...(payload.original_analysis?.ai_generated_tags?.metadata?.tags || []),

      // Check search_tags if available
      ...(payload.search_tags || []),
    ].filter(Boolean);

    // Check if any query word matches any tag
    return queryWords.some((queryWord) =>
      tagFields.some(
        (tag) =>
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
      cultural_significance: 3,
    };

    // Check exact matches with higher weight
    if (queryLower.includes(payload.room_type?.toLowerCase()))
      score += weights.room_type;
    if (queryLower.includes(payload.design_theme?.toLowerCase()))
      score += weights.design_theme;

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
      ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.materials || []
      ) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.ai_generated_tags?.indian_context?.traditional_elements ||
        []),
      ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),
      payload.ai_generated_tags?.indian_context?.cultural_significance,
      ...(payload.ai_generated_tags?.metadata?.tags || []),

      // original_analysis structure
      payload.original_analysis?.ai_generated_tags?.room,
      payload.original_analysis?.ai_generated_tags?.theme,
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
        ?.colors || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
        ?.materials || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
        (obj) => obj.type
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.materials || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context
        ?.traditional_elements || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context
        ?.modern_adaptations || []),
      payload.original_analysis?.ai_generated_tags?.indian_context
        ?.cultural_significance,
      ...(payload.original_analysis?.ai_generated_tags?.metadata?.tags || []),

      // search_tags
      ...(payload.search_tags || []),
    ].filter(Boolean);

    queryWords.forEach((queryWord) => {
      allTags.forEach((tag) => {
        if (
          tag.toLowerCase().includes(queryWord) ||
          queryWord.includes(tag.toLowerCase())
        ) {
          // Assign weight based on field type
          if (
            payload.tags?.primary_features?.includes(tag) ||
            payload.ai_generated_tags?.primary_features?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.primary_features?.includes(
              tag
            )
          ) {
            score += weights.primary_features;
          } else if (
            payload.tags?.materials?.includes(tag) ||
            payload.ai_generated_tags?.visual_attributes?.materials?.includes(
              tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials?.includes(
              tag
            )
          ) {
            score += weights.materials;
          } else if (
            payload.tags?.colors?.includes(tag) ||
            payload.ai_generated_tags?.visual_attributes?.colors?.includes(
              tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors?.includes(
              tag
            )
          ) {
            score += weights.colors;
          } else if (
            payload.tags?.object_types?.includes(tag) ||
            payload.ai_generated_tags?.objects?.some(
              (obj) => obj.type === tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.objects?.some(
              (obj) => obj.type === tag
            )
          ) {
            score += weights.object_types;
          } else if (
            payload.tags?.functionality === tag ||
            payload.ai_generated_tags?.metadata?.functionality === tag ||
            payload.original_analysis?.ai_generated_tags?.metadata
              ?.functionality === tag
          ) {
            score += weights.functionality;
          } else if (
            payload.tags?.regional_style === tag ||
            payload.ai_generated_tags?.indian_context?.regional_style === tag ||
            payload.original_analysis?.ai_generated_tags?.indian_context
              ?.regional_style === tag
          ) {
            score += weights.regional_style;
          } else if (
            payload.indian_context?.traditional_elements?.includes(tag) ||
            payload.ai_generated_tags?.indian_context?.traditional_elements?.includes(
              tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.traditional_elements?.includes(
              tag
            )
          ) {
            score += weights.traditional_elements;
          } else if (
            payload.indian_context?.modern_adaptations?.includes(tag) ||
            payload.ai_generated_tags?.indian_context?.modern_adaptations?.includes(
              tag
            ) ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.modern_adaptations?.includes(
              tag
            )
          ) {
            score += weights.modern_adaptations;
          } else if (
            payload.indian_context?.cultural_significance === tag ||
            payload.ai_generated_tags?.indian_context?.cultural_significance ===
              tag ||
            payload.original_analysis?.ai_generated_tags?.indian_context
              ?.cultural_significance === tag
          ) {
            score += weights.cultural_significance;
          } else if (payload.search_tags?.includes(tag)) {
            score += 3; // Medium weight for search tags
          } else {
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
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    return results.sort((a, b) => {
      const scoreA = this.calculateTagMatchScore(
        a.payload,
        queryWords,
        queryLower
      );
      const scoreB = this.calculateTagMatchScore(
        b.payload,
        queryWords,
        queryLower
      );

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
      room_type:
        payload.ai_generated_tags?.room ||
        payload.original_analysis?.ai_generated_tags?.room ||
        payload.room_type,
      design_theme:
        payload.ai_generated_tags?.theme ||
        payload.original_analysis?.ai_generated_tags?.theme ||
        payload.design_theme,
      budget_category: payload.budget_category,
      space_type: payload.space_type,
      tags: {
        ...payload.tags,
        // Merge with ai_generated_tags if available
        colors: [
          ...(payload.tags?.colors || []),
          ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
          ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
            ?.colors || []),
        ],
        materials: [
          ...(payload.tags?.materials || []),
          ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
          ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
            ?.materials || []),
        ],
        primary_features: [
          ...(payload.tags?.primary_features || []),
          ...(payload.ai_generated_tags?.primary_features || []),
          ...(payload.original_analysis?.ai_generated_tags?.primary_features ||
            []),
        ],
        object_types: [
          ...(payload.tags?.object_types || []),
          ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
          ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
            (obj) => obj.type
          ) || []),
        ],
        // Add object features and materials
        object_features: [
          ...(payload.ai_generated_tags?.objects?.flatMap(
            (obj) => obj.features || []
          ) || []),
          ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
            (obj) => obj.features || []
          ) || []),
        ],
        object_materials: [
          ...(payload.ai_generated_tags?.objects?.flatMap(
            (obj) => obj.materials || []
          ) || []),
          ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
            (obj) => obj.materials || []
          ) || []),
        ],
      },
      indian_context: {
        ...payload.indian_context,
        ...(payload.ai_generated_tags?.indian_context && {
          traditional_elements: [
            ...(payload.indian_context?.traditional_elements || []),
            ...(payload.ai_generated_tags.indian_context.traditional_elements ||
              []),
          ],
          modern_adaptations: [
            ...(payload.indian_context?.modern_adaptations || []),
            ...(payload.ai_generated_tags.indian_context.modern_adaptations ||
              []),
          ],
          cultural_significance:
            payload.ai_generated_tags.indian_context.cultural_significance ||
            payload.indian_context?.cultural_significance,
        }),
        ...(payload.original_analysis?.ai_generated_tags?.indian_context && {
          traditional_elements: [
            ...(payload.indian_context?.traditional_elements || []),
            ...(payload.original_analysis.ai_generated_tags.indian_context
              .traditional_elements || []),
          ],
          modern_adaptations: [
            ...(payload.indian_context?.modern_adaptations || []),
            ...(payload.original_analysis.ai_generated_tags.indian_context
              .modern_adaptations || []),
          ],
          cultural_significance:
            payload.original_analysis.ai_generated_tags.indian_context
              .cultural_significance ||
            payload.indian_context?.cultural_significance,
        }),
      },
      confidence_scores:
        payload.confidence_scores ||
        payload.ai_generated_tags?.confidence_scores ||
        payload.original_analysis?.ai_generated_tags?.confidence_scores,
      // Add search tags for comprehensive search
      search_tags: payload.search_tags || [],
    };

    return consolidatedResult;
  }

  /**
   * Get matched fields for search metadata
   */
  getMatchedFields(query, results) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    return results.map((result) => {
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
        ai_objects: payload.ai_generated_tags?.objects?.map((obj) => obj.type),
      };

      Object.entries(allFields).forEach(([field, values]) => {
        if (values) {
          const valueArray = Array.isArray(values) ? values : [values];
          valueArray.forEach((value) => {
            queryWords.forEach((queryWord) => {
              if (
                value.toLowerCase().includes(queryWord) ||
                queryWord.includes(value.toLowerCase())
              ) {
                matchedFields.push({ field, value });
              }
            });
          });
        }
      });

      return {
        image_id: result.id,
        matched_fields: matchedFields,
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

  /**
   * HIERARCHICAL SEARCH - Strict room type filtering first
   * Search priority: 1) Room Type (must match if specified), 2) Features, 3) Style, 4) Objects
   */
  async hierarchicalSearch(query, limit = 10) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error("Search query is required");
      }

      console.log(`🏠 Hierarchical search for: "${query}"`);

      // Step 1: Detect room type from query using enhanced detection
      const detectedRoomType = await this.detectRoomTypeFromQuery(query);
      console.log(`🔍 Detected room type: ${detectedRoomType || "None"}`);

      // Step 2: Get all potential results using vector search
      const queryVector = await qdrantService.getEmbedding(query.trim());
      const allResults = await qdrantService.client.search("interior_images", {
        vector: { name: "primary_search", vector: queryVector },
        limit: parseInt(limit) * 10, // Get more results for strict filtering
        with_payload: true,
        with_vector: false,
      });

      console.log(`📊 Total potential results: ${allResults.length}`);

      // Step 3: Apply hierarchical filtering
      let filteredResults = [];

      if (detectedRoomType) {
        // STRICT ROOM TYPE FILTERING - If room type detected, it MUST match
        console.log(
          `🎯 Applying strict room type filter for: "${detectedRoomType}"`
        );

        filteredResults = allResults.filter((result) => {
          const roomMatches = this.checkRoomTypeMatch(
            result.payload,
            detectedRoomType
          );
          return roomMatches;
        });

        console.log(`🏠 Room type matches found: ${filteredResults.length}`);

        // If no room type matches found, return empty results
        if (filteredResults.length === 0) {
          return {
            success: true,
            images: [],
            query: query,
            message: `No ${detectedRoomType} images found. Please search for available room types.`,
            search_metadata: {
              search_strategy: "hierarchical_strict_room_filtering",
              detected_room_type: detectedRoomType,
              room_matches_found: 0,
              total_searched: allResults.length,
              strict_filtering_applied: true,
              available_room_types: await this.getAvailableRoomTypes(),
            },
          };
        }

        // Step 4: Apply secondary filters only within the room type matches
        filteredResults = this.applySecondaryFilters(
          filteredResults,
          query,
          detectedRoomType
        );
      } else {
        // No specific room type detected - use enhanced filtering
        console.log(`🔍 No specific room type detected, using enhanced search`);
        filteredResults = this.filterByAllTags(allResults, query);
      }

      // Step 5: Sort by hierarchical relevance
      const sortedResults = this.sortByHierarchicalRelevance(
        filteredResults,
        query,
        detectedRoomType
      );

      // Step 6: Limit results
      const limitedResults = sortedResults.slice(0, parseInt(limit));

      console.log(`✅ Final hierarchical results: ${limitedResults.length}`);

      return {
        success: true,
        images: limitedResults.map((result) =>
          this.formatEnhancedResult(result)
        ),
        query: query,
        message: `Found ${limitedResults.length} matching images${
          detectedRoomType ? ` for ${detectedRoomType}` : ""
        }`,
        search_metadata: {
          search_strategy: "hierarchical_room_first",
          detected_room_type: detectedRoomType,
          total_searched: allResults.length,
          room_filtered: detectedRoomType ? filteredResults.length : null,
          final_results: limitedResults.length,
          strict_filtering_applied: !!detectedRoomType,
          hierarchy_applied: ["room_type", "features", "style", "objects"],
        },
      };
    } catch (error) {
      console.error("Hierarchical search error:", error);
      throw new Error(`Hierarchical search failed: ${error.message}`);
    }
  }

  /**
   * Enhanced room type detection from query
   */
  async detectRoomTypeFromQuery(query) {
    const queryLower = query.toLowerCase();

    // Enhanced room type patterns with variations and synonyms
    const roomTypePatterns = {
      "living room": [
        "living room",
        "living",
        "lounge",
        "sitting room",
        "family room",
        "drawing room",
        "front room",
        "main room",
        "hall room",
      ],
      bedroom: [
        "bedroom",
        "bed room",
        "master bedroom",
        "guest bedroom",
        "kid bedroom",
        "children bedroom",
        "child bedroom",
        "sleeping room",
        "master bed",
      ],
      kitchen: [
        "kitchen",
        "modular kitchen",
        "open kitchen",
        "galley kitchen",
        "kitchen area",
        "cooking area",
        "culinary space",
      ],
      bathroom: [
        "bathroom",
        "bath room",
        "washroom",
        "toilet",
        "powder room",
        "guest bathroom",
        "master bathroom",
        "ensuite",
        "lavatory",
      ],
      "dining room": [
        "dining room",
        "dining",
        "dinner room",
        "eating area",
        "dining space",
        "dining hall",
      ],
      "home office": [
        "home office",
        "office",
        "study room",
        "study",
        "workspace",
        "work room",
        "den",
        "library",
      ],
      entryway: [
        "entryway",
        "entrance",
        "foyer",
        "entry",
        "hallway",
        "corridor",
        "entrance hall",
        "front entrance",
      ],
      balcony: [
        "balcony",
        "terrace",
        "veranda",
        "patio",
        "deck",
        "outdoor space",
      ],
      closet: [
        "closet",
        "wardrobe",
        "walk-in closet",
        "dressing room",
        "storage room",
        "utility room",
      ],
      "pooja room": [
        "pooja room",
        "prayer room",
        "mandir",
        "temple room",
        "puja room",
        "spiritual room",
        "worship room",
      ],
    };

    // Check for room type matches
    for (const [roomType, patterns] of Object.entries(roomTypePatterns)) {
      for (const pattern of patterns) {
        if (queryLower.includes(pattern)) {
          console.log(
            `🎯 Room type detected: "${roomType}" from pattern: "${pattern}"`
          );
          return roomType;
        }
      }
    }

    // Use the existing query intelligence service as fallback
    try {
      const intelligentRoomType = await queryIntelligenceService.detectRoomType(
        query
      );
      if (intelligentRoomType) {
        console.log(`🤖 AI detected room type: "${intelligentRoomType}"`);
        return intelligentRoomType;
      }
    } catch (error) {
      console.log("AI room detection failed, continuing with pattern matching");
    }

    return null;
  }

  /**
   * Check if a result matches the detected room type
   */
  checkRoomTypeMatch(payload, detectedRoomType) {
    const roomSources = [
      payload.room_type,
      payload.ai_generated_tags?.room,
      payload.original_analysis?.ai_generated_tags?.room,
    ].filter(Boolean);

    // Normalize room types for comparison
    const normalizeRoomType = (room) => {
      if (!room) return "";
      return room.toLowerCase().replace(/\s+/g, " ").trim();
    };

    const normalizedDetected = normalizeRoomType(detectedRoomType);

    return roomSources.some((room) => {
      const normalizedRoom = normalizeRoomType(room);

      // Exact match
      if (normalizedRoom === normalizedDetected) return true;

      // Partial match (contains)
      if (
        normalizedRoom.includes(normalizedDetected) ||
        normalizedDetected.includes(normalizedRoom)
      )
        return true;

      // Handle common variations
      const variations = {
        "living room": ["living", "lounge", "sitting room", "family room"],
        bedroom: ["bed room", "master bedroom", "guest bedroom"],
        kitchen: ["modular kitchen", "open kitchen"],
        bathroom: ["washroom", "toilet", "powder room"],
        "dining room": ["dining", "dinner room"],
        "home office": ["office", "study room", "study"],
        "pooja room": ["prayer room", "mandir", "temple room"],
      };

      // Check if detected room type has variations that match
      if (variations[normalizedDetected]) {
        return variations[normalizedDetected].some(
          (variation) =>
            normalizedRoom.includes(variation) ||
            variation.includes(normalizedRoom)
        );
      }

      // Check reverse - if the stored room has variations
      for (const [key, vars] of Object.entries(variations)) {
        if (vars.includes(normalizedDetected) && normalizedRoom.includes(key)) {
          return true;
        }
      }

      return false;
    });
  }

  /**
   * Apply secondary filters (features, style, objects) within room type matches
   */
  applySecondaryFilters(roomFilteredResults, query, detectedRoomType) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter(
        (word) =>
          word.length > 2 && !this.isRoomTypeWord(word, detectedRoomType)
      );

    if (queryWords.length === 0) {
      // Only room type specified, return all room matches
      return roomFilteredResults;
    }

    console.log(
      `🔧 Applying secondary filters for: [${queryWords.join(", ")}]`
    );

    return roomFilteredResults.filter((result) => {
      return this.checkSecondaryMatch(result.payload, queryWords);
    });
  }

  /**
   * Check if a word is part of the room type (to exclude from secondary filtering)
   */
  isRoomTypeWord(word, detectedRoomType) {
    if (!detectedRoomType) return false;
    const roomWords = detectedRoomType.toLowerCase().split(/\s+/);
    return roomWords.includes(word);
  }

  /**
   * Check secondary matches (features, style, objects)
   */
  checkSecondaryMatch(payload, queryWords) {
    // Collect all secondary attributes (non-room-type)
    const secondaryAttributes = [
      // Style and theme
      payload.design_theme,
      payload.ai_generated_tags?.theme,
      payload.original_analysis?.ai_generated_tags?.theme,

      // Features
      ...(payload.tags?.primary_features || []),
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),

      // Materials and colors
      ...(payload.tags?.materials || []),
      ...(payload.tags?.colors || []),
      ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
      ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
        ?.materials || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
        ?.colors || []),

      // Objects and their features
      ...(payload.tags?.object_types || []),
      ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.materials || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
        (obj) => obj.type
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),

      // Indian context
      ...(payload.indian_context?.traditional_elements || []),
      ...(payload.indian_context?.modern_adaptations || []),
      ...(payload.ai_generated_tags?.indian_context?.traditional_elements ||
        []),
      ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),

      // Budget and functionality
      payload.budget_category,
      payload.space_type,
      payload.tags?.functionality,
      payload.ai_generated_tags?.metadata?.functionality,
    ].filter(Boolean);

    // Check if any query word matches secondary attributes
    return queryWords.some((queryWord) =>
      secondaryAttributes.some(
        (attr) =>
          attr.toLowerCase().includes(queryWord) ||
          queryWord.includes(attr.toLowerCase())
      )
    );
  }

  /**
   * Sort by hierarchical relevance (room match + secondary attributes)
   */
  sortByHierarchicalRelevance(results, query, detectedRoomType) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    return results.sort((a, b) => {
      // Calculate hierarchical scores
      const scoreA = this.calculateHierarchicalScore(
        a.payload,
        queryWords,
        detectedRoomType
      );
      const scoreB = this.calculateHierarchicalScore(
        b.payload,
        queryWords,
        detectedRoomType
      );

      if (scoreA.total !== scoreB.total) {
        return scoreB.total - scoreA.total;
      }

      // Fallback to vector similarity
      return b.score - a.score;
    });
  }

  /**
   * Calculate hierarchical score based on search priorities
   */
  calculateHierarchicalScore(payload, queryWords, detectedRoomType) {
    let score = {
      room: 0,
      features: 0,
      style: 0,
      objects: 0,
      total: 0,
    };

    const weights = {
      room: 100, // Highest priority
      features: 50, // Second priority
      style: 25, // Third priority
      objects: 15, // Fourth priority
    };

    // Room score (if room type was detected, all results already match)
    if (detectedRoomType) {
      score.room = weights.room;
    }

    // Features score
    const features = [
      ...(payload.tags?.primary_features || []),
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
    ];

    score.features =
      this.calculateMatchScore(features, queryWords) * weights.features;

    // Style score (theme, design, indian context)
    const styleAttributes = [
      payload.design_theme,
      payload.ai_generated_tags?.theme,
      payload.original_analysis?.ai_generated_tags?.theme,
      ...(payload.indian_context?.traditional_elements || []),
      ...(payload.ai_generated_tags?.indian_context?.traditional_elements ||
        []),
    ].filter(Boolean);

    score.style =
      this.calculateMatchScore(styleAttributes, queryWords) * weights.style;

    // Objects score
    const objectAttributes = [
      ...(payload.tags?.object_types || []),
      ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
        (obj) => obj.type
      ) || []),
    ];

    score.objects =
      this.calculateMatchScore(objectAttributes, queryWords) * weights.objects;

    score.total = score.room + score.features + score.style + score.objects;

    return score;
  }

  /**
   * Calculate match score for a set of attributes
   */
  calculateMatchScore(attributes, queryWords) {
    let matches = 0;
    queryWords.forEach((queryWord) => {
      attributes.forEach((attr) => {
        if (
          attr &&
          (attr.toLowerCase().includes(queryWord) ||
            queryWord.includes(attr.toLowerCase()))
        ) {
          matches++;
        }
      });
    });
    return matches;
  }

  /**
   * Get available room types in the database
   */
  async getAvailableRoomTypes() {
    try {
      const response = await qdrantService.client.scroll("interior_images", {
        limit: 1000,
        with_payload: true,
        with_vector: false,
      });

      const roomTypes = new Set();
      response.points.forEach((point) => {
        const payload = point.payload;
        [
          payload.room_type,
          payload.ai_generated_tags?.room,
          payload.original_analysis?.ai_generated_tags?.room,
        ].forEach((room) => {
          if (room) roomTypes.add(room);
        });
      });

      return Array.from(roomTypes);
    } catch (error) {
      console.error("Error getting available room types:", error);
      return [];
    }
  }
}

export default new ImageService();

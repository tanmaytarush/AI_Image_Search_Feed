import qdrantService from "./qdrantService.js";
import queryIntelligenceService from "./queryIntelligenceService.js";
import fs from "fs";
import csv from "csv-parser";

class ImageService {
  constructor() {
    this.csvFilePath = "./src/data/interior-image-urls.csv";

    // Complete 6-Level Hierarchical Scoring System
    this.hierarchicalWeights = {
      level1_room_type: 10, // Room Type (MOST IMPORTANT)
      level2_room_features: 8, // Room Features & Architecture
      level3_objects_furniture: 7, // Objects & Furniture
      level4_object_features: 6, // Object Features & Materials
      level5_style_cultural: 5, // Style & Cultural Context
      level6_final_ranking: 4, // Final Ranking & Scoring
    };
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
   * Complete 6-Level Hierarchical AI-Intelligent Search
   */
  async searchImages(query, limit = 10) {
    if (!query || query.trim().length === 0) {
      throw new Error("Search query is required");
    }

    console.log(`🤖 Complete 6-Level Hierarchical Search for: "${query}"`);

    try {
      // Step 1: AI-Powered Query Analysis using existing service
      const aiRoomDetection = await queryIntelligenceService.aiDetectRoomType(
        query
      );
      const aiKeywords = await queryIntelligenceService.aiExtractKeywords(
        query
      );

      // Step 2: Enhanced Query Analysis with Intent Detection
      const queryAnalysis = await this.analyzeQueryWithIntent(
        query,
        aiRoomDetection,
        aiKeywords
      );

      console.log(`📋 Enhanced Query Analysis:`, queryAnalysis);

      // Step 3: Get initial search results
      const enhancedFilters = queryIntelligenceService.buildEnhancedFilters(
        {},
        aiRoomDetection,
        aiKeywords
      );

      const searchResponse = await qdrantService.search(
        query,
        limit * 5,
        enhancedFilters
      );
      const searchResults = searchResponse.results || [];
      console.log(`📊 Initial search results: ${searchResults.length}`);

      // Step 4: Apply Complete 6-Level Hierarchical Filtration
      const hierarchicalResults =
        await this.applyCompleteHierarchicalFiltration(
          searchResults,
          queryAnalysis,
          limit
        );

      // Step 5: Final AI Enhancement using existing service
      const enhancedResponse = await queryIntelligenceService.aiEnhanceResults(
        { results: hierarchicalResults },
        query,
        aiRoomDetection,
        aiKeywords
      );
      const enhancedResults = enhancedResponse.results || hierarchicalResults;

      console.log(
        `✅ Complete 6-Level Hierarchical Search complete: ${enhancedResults.length} results`
      );

      return {
        success: true,
        images: enhancedResults.map((result) =>
          this.formatEnhancedResult(result)
        ),
        query: query,
        message: `Found ${enhancedResults.length} matching images`,
        search_metadata: {
          search_strategy: "complete_6_level_hierarchical_ai_search",
          query_analysis: queryAnalysis,
          ai_insights: {
            detected_room: aiRoomDetection,
            extracted_keywords: aiKeywords,
            room_type_filter_applied:
              aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.7,
            confidence_score: aiRoomDetection?.confidence || 0,
            hierarchical_levels_applied: 6,
            total_searched: searchResults.length,
            total_filtered: enhancedResults.length,
          },
          original_query: query,
          enhanced_query: queryAnalysis.enhanced_query || query,
        },
      };
    } catch (error) {
      console.error("Complete 6-Level Hierarchical Search error:", error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Enhanced Query Analysis with Intent Detection
   */
  async analyzeQueryWithIntent(query, aiRoomDetection, aiKeywords) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    // Detect query intent and context
    const intent = this.detectQueryIntent(query, aiRoomDetection, aiKeywords);

    // Detect cultural context weighting
    const culturalWeighting = this.detectCulturalWeighting(query, aiKeywords);

    // Use AI's furniture detection for consistency
    const isFurnitureQuery = aiRoomDetection?.isFurnitureQuery || false;

    return {
      original_query: query,
      enhanced_query: query,
      intent: intent,
      components: {
        room_type: {
          detected: aiRoomDetection?.detectedRoom,
          confidence: aiRoomDetection?.confidence || 0,
          isFurnitureQuery: isFurnitureQuery,
          furnitureType: aiRoomDetection?.furnitureType || null,
        },
        objects: this.extractObjects(queryWords, aiKeywords),
        room_features: this.extractRoomFeatures(queryWords, aiKeywords),
        object_features: this.extractObjectFeatures(queryWords, aiKeywords),
        style: this.extractStyle(queryWords, aiKeywords),
        cultural: this.extractCultural(queryWords, aiKeywords),
      },
      keywords: aiKeywords,
      cultural_weighting: culturalWeighting,
      query_words: queryWords,
    };
  }

  /**
   * Complete 6-Level Hierarchical Filtration
   */
  async applyCompleteHierarchicalFiltration(
    searchResults,
    queryAnalysis,
    limit
  ) {
    console.log(`🏗️ Applying Complete 6-Level Hierarchical Filtration...`);

    let currentResults = searchResults;
    const levelResults = [];

    // Level 1: Room Type (MOST IMPORTANT)
    const level1Results = await this.applyLevel1RoomType(
      currentResults,
      queryAnalysis
    );
    levelResults.push({
      level: 1,
      name: "Room Type",
      count: level1Results.length,
      weight: this.hierarchicalWeights.level1_room_type,
    });
    currentResults = level1Results;

    // Level 2: Room Features & Architecture
    const level2Results = await this.applyLevel2RoomFeatures(
      currentResults,
      queryAnalysis
    );
    levelResults.push({
      level: 2,
      name: "Room Features",
      count: level2Results.length,
      weight: this.hierarchicalWeights.level2_room_features,
    });
    currentResults = level2Results;

    // Level 3: Objects & Furniture
    const level3Results = await this.applyLevel3ObjectsFurniture(
      currentResults,
      queryAnalysis
    );
    levelResults.push({
      level: 3,
      name: "Objects/Furniture",
      count: level3Results.length,
      weight: this.hierarchicalWeights.level3_objects_furniture,
    });
    currentResults = level3Results;

    // Level 4: Object Features & Materials
    const level4Results = await this.applyLevel4ObjectFeatures(
      currentResults,
      queryAnalysis
    );
    levelResults.push({
      level: 4,
      name: "Object Features",
      count: level4Results.length,
      weight: this.hierarchicalWeights.level4_object_features,
    });
    currentResults = level4Results;

    // Level 5: Style & Cultural Context
    const level5Results = await this.applyLevel5StyleCultural(
      currentResults,
      queryAnalysis
    );
    levelResults.push({
      level: 5,
      name: "Style/Cultural",
      count: level5Results.length,
      weight: this.hierarchicalWeights.level5_style_cultural,
    });
    currentResults = level5Results;

    // Level 6: Final Ranking & Scoring
    const level6Results = await this.applyLevel6FinalRanking(
      currentResults,
      queryAnalysis,
      limit
    );
    levelResults.push({
      level: 6,
      name: "Final Ranking",
      count: level6Results.length,
      weight: this.hierarchicalWeights.level6_final_ranking,
    });

    console.log(`📊 Hierarchical Filtration Summary:`);
    levelResults.forEach((level) => {
      console.log(
        `   Level ${level.level} (${level.name}): ${level.count} results (weight: ${level.weight})`
      );
    });

    return level6Results;
  }

  /**
   * Level 1: Room Type (MOST IMPORTANT)
   */
  async applyLevel1RoomType(results, queryAnalysis) {
    const roomType = queryAnalysis.components.room_type.detected;
    const isFurnitureQuery =
      queryAnalysis.components.room_type.isFurnitureQuery;

    // Safety check: If this is a furniture query, ensure room type is null
    if (isFurnitureQuery && roomType) {
      console.log(
        `⚠️ Level 1: Inconsistent AI response - furniture query but room type detected: "${roomType}". Ignoring room type.`
      );
      queryAnalysis.components.room_type.detected = null;
      queryAnalysis.components.room_type.confidence = 0;
    }

    // If this is a furniture/object query, don't filter by room type
    if (isFurnitureQuery) {
      console.log(
        `📍 Level 1: Furniture/object query detected, skipping room type filtering`
      );
      return results;
    }

    if (!roomType || queryAnalysis.components.room_type.confidence < 0.7) {
      console.log(
        `📍 Level 1: No high-confidence room type detected, keeping all results`
      );
      return results;
    }

    console.log(`🏠 Level 1: Filtering by room type "${roomType}"`);

    // Debug: Show some room types from the database
    const sampleRoomTypes = results
      .slice(0, 5)
      .map((r) => this.getRoomType(r.payload))
      .filter(Boolean);
    console.log(
      `🔍 Sample room types in database: ${sampleRoomTypes.join(", ")}`
    );

    return results.filter((result) => {
      const imageRoomType = this.getRoomType(result.payload);
      if (!imageRoomType) {
        console.log(`❌ No room type found for result: ${result.id}`);
        return false;
      }

      const imageRoomLower = imageRoomType.toLowerCase();
      const detectedRoomLower = roomType.toLowerCase();

      const isMatch =
        imageRoomLower.includes(detectedRoomLower) ||
        detectedRoomLower.includes(imageRoomLower) ||
        imageRoomLower === detectedRoomLower;

      if (isMatch) {
        console.log(
          `✅ Room type match: "${imageRoomType}" matches "${roomType}"`
        );
      } else {
        console.log(
          `❌ Room type mismatch: "${imageRoomType}" doesn't match "${roomType}"`
        );
      }

      return isMatch;
    });
  }

  /**
   * Level 2: Room Features & Architecture
   */
  async applyLevel2RoomFeatures(results, queryAnalysis) {
    const roomFeatures = queryAnalysis.components.room_features;

    if (roomFeatures.length === 0) {
      console.log(`📍 Level 2: No room features detected, keeping all results`);
      return results;
    }

    console.log(
      `🏗️ Level 2: Filtering by room features: ${roomFeatures.join(", ")}`
    );

    return results.filter((result) => {
      const roomFeatureTags = this.getRoomFeatureTags(result.payload);

      return roomFeatures.some((feature) =>
        roomFeatureTags.some(
          (tag) =>
            tag.toLowerCase().includes(feature.toLowerCase()) ||
            feature.toLowerCase().includes(tag.toLowerCase())
        )
      );
    });
  }

  /**
   * Level 3: Objects & Furniture
   */
  async applyLevel3ObjectsFurniture(results, queryAnalysis) {
    const objects = queryAnalysis.components.objects;

    if (objects.length === 0) {
      console.log(`📍 Level 3: No objects detected, keeping all results`);
      return results;
    }

    console.log(`🪑 Level 3: Filtering by objects: ${objects.join(", ")}`);

    return results.filter((result) => {
      const objectTypes = this.getObjectTypes(result.payload);
      const primaryFeatures = this.getRoomFeatureTags(result.payload);
      const allTags = this.getAllTags(result.payload);

      // Combine all possible object-related tags
      const allObjectTags = [...objectTypes, ...primaryFeatures, ...allTags];

      return objects.some((object) => {
        // CONTEXT-AWARE MATCHING: Avoid false matches

        // 1. Exact match (highest priority)
        const exactMatches = allObjectTags.some(
          (tag) => tag.toLowerCase() === object.toLowerCase()
        );
        if (exactMatches) {
          console.log(`✅ Exact match found: "${object}" in result`);
          return true;
        }

        // 2. For compound terms like "bar unit", check for context-appropriate matches
        if (object.includes(" ")) {
          const objectWords = object.toLowerCase().split(" ");
          const objectPhrase = object.toLowerCase();

          // Special handling for bar-related queries
          if (object.toLowerCase().includes("bar")) {
            const barMatches = allObjectTags.some((tag) => {
              const tagLower = tag.toLowerCase();
              return (
                tagLower.includes("bar") ||
                tagLower.includes("wet bar") ||
                tagLower.includes("vanity")
              );
            });
            if (barMatches) {
              console.log(
                `✅ Bar-related match found: "${object}" matches bar content in result`
              );
              return true;
            }
          }

          // For compound terms, require more precise matching
          // First check for exact phrase match
          const exactPhraseMatch = allObjectTags.some(
            (tag) => tag.toLowerCase() === objectPhrase
          );
          if (exactPhraseMatch) {
            console.log(`✅ Exact compound match found: "${object}" in result`);
            return true;
          }

          // Then check for phrase contained within tags
          const phraseContainedMatch = allObjectTags.some((tag) =>
            tag.toLowerCase().includes(objectPhrase)
          );
          if (phraseContainedMatch) {
            console.log(
              `✅ Compound phrase contained: "${object}" found within result tags`
            );
            return true;
          }

          // Finally, check if ALL words are present in the SAME tag (not across different tags)
          const sameTagMatch = allObjectTags.some((tag) => {
            const tagLower = tag.toLowerCase();
            return objectWords.every((word) => tagLower.includes(word));
          });
          if (sameTagMatch) {
            console.log(
              `✅ Compound words in same tag: all words of "${object}" found in single tag`
            );
            return true;
          }

          // If none of the above match, don't consider it a match
          console.log(`❌ No precise compound match for "${object}" in result`);
          return false;
        }

        // 3. For single words, only allow very close matches (not broad partial matches)
        if (!object.includes(" ")) {
          const closeMatches = allObjectTags.some((tag) => {
            const tagLower = tag.toLowerCase();
            const objectLower = object.toLowerCase();

            // Only allow matches that are very close (not just containing the word)
            return (
              tagLower === objectLower ||
              tagLower.startsWith(objectLower) ||
              objectLower.startsWith(tagLower) ||
              tagLower.includes(` ${objectLower} `) ||
              tagLower.endsWith(` ${objectLower}`) ||
              tagLower.startsWith(`${objectLower} `)
            );
          });

          if (closeMatches) {
            console.log(
              `✅ Close match found: "${object}" closely matches result`
            );
            return true;
          }
        }

        // 4. If no good matches found, don't include this result
        console.log(`❌ No good match for "${object}" in result`);
        return false;
      });
    });
  }

  /**
   * Level 4: Object Features & Materials
   */
  async applyLevel4ObjectFeatures(results, queryAnalysis) {
    const objectFeatures = queryAnalysis.components.object_features;

    if (objectFeatures.length === 0) {
      console.log(
        `📍 Level 4: No object features detected, keeping all results`
      );
      return results;
    }

    console.log(
      `✨ Level 4: Filtering by object features: ${objectFeatures.join(", ")}`
    );

    return results.filter((result) => {
      const allTags = this.getAllTags(result.payload);

      return objectFeatures.some((feature) =>
        allTags.some(
          (tag) =>
            tag.toLowerCase().includes(feature.toLowerCase()) ||
            feature.toLowerCase().includes(tag.toLowerCase())
        )
      );
    });
  }

  /**
   * Level 5: Style & Cultural Context
   */
  async applyLevel5StyleCultural(results, queryAnalysis) {
    const style = queryAnalysis.components.style;
    const cultural = queryAnalysis.components.cultural;

    if (style.length === 0 && cultural.length === 0) {
      console.log(
        `📍 Level 5: No style/cultural elements detected, keeping all results`
      );
      return results;
    }

    console.log(
      `🎨 Level 5: Filtering by style: ${style.join(
        ", "
      )} and cultural: ${cultural.join(", ")}`
    );

    return results.filter((result) => {
      const styleTags = this.getStyleTags(result.payload);
      const culturalTags = this.getCulturalTags(result.payload);

      // Debug: Show what tags we're looking for vs what we found
      console.log(`🔍 Result ${result.id}:`);
      console.log(`   Looking for style: ${style.join(", ")}`);
      console.log(`   Found style tags: ${styleTags.join(", ")}`);
      console.log(`   Looking for cultural: ${cultural.join(", ")}`);
      console.log(`   Found cultural tags: ${culturalTags.join(", ")}`);

      const styleMatch =
        style.length === 0 ||
        style.some((s) =>
          styleTags.some(
            (tag) =>
              tag?.toLowerCase().includes(s.toLowerCase()) ||
              s.toLowerCase().includes(tag?.toLowerCase())
          )
        );

      const culturalMatch =
        cultural.length === 0 ||
        cultural.some((c) =>
          culturalTags.some(
            (tag) =>
              tag?.toLowerCase().includes(c.toLowerCase()) ||
              c.toLowerCase().includes(tag?.toLowerCase())
          )
        );

      const isMatch = styleMatch && culturalMatch;
      console.log(
        `   Style match: ${styleMatch}, Cultural match: ${culturalMatch}, Final: ${isMatch}`
      );

      return isMatch;
    });
  }

  /**
   * Level 6: Final Ranking & Scoring
   */
  async applyLevel6FinalRanking(results, queryAnalysis, limit) {
    console.log(`🏆 Level 6: Applying final ranking and scoring`);

    // Calculate comprehensive scores for each result
    const scoredResults = results.map((result) => {
      const score = this.calculateComprehensiveScore(result, queryAnalysis);
      return { ...result, comprehensive_score: score };
    });

    // Sort by comprehensive score (highest first)
    const rankedResults = scoredResults.sort(
      (a, b) => b.comprehensive_score - a.comprehensive_score
    );

    return rankedResults.slice(0, limit);
  }

  /**
   * Calculate Comprehensive Score
   */
  calculateComprehensiveScore(result, queryAnalysis) {
    let totalScore = 0;
    const payload = result.payload;
    const isFurnitureQuery =
      queryAnalysis.components.room_type.isFurnitureQuery;

    // For furniture queries, prioritize objects and features over room type
    if (isFurnitureQuery) {
      // Level 3: Objects Score (HIGHEST PRIORITY for furniture queries)
      const objects = queryAnalysis.components.objects;
      const objectTypes = this.getObjectTypes(payload);
      objects.forEach((object) => {
        if (
          objectTypes.some(
            (objType) =>
              objType.toLowerCase().includes(object.toLowerCase()) ||
              object.toLowerCase().includes(objType.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level3_objects_furniture * 2; // Double weight for furniture queries
        }
      });

      // Level 4: Object Features Score (HIGH PRIORITY for furniture queries)
      const objectFeatures = queryAnalysis.components.object_features;
      const allTags = this.getAllTags(payload);
      objectFeatures.forEach((feature) => {
        if (
          allTags.some(
            (tag) =>
              tag.toLowerCase().includes(feature.toLowerCase()) ||
              feature.toLowerCase().includes(tag.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level4_object_features * 1.5; // 1.5x weight for furniture queries
        }
      });

      // Level 2: Room Features Score (MEDIUM PRIORITY for furniture queries)
      const roomFeatures = queryAnalysis.components.room_features;
      const roomFeatureTags = this.getRoomFeatureTags(payload);
      roomFeatures.forEach((feature) => {
        if (
          roomFeatureTags.some(
            (tag) =>
              tag.toLowerCase().includes(feature.toLowerCase()) ||
              feature.toLowerCase().includes(tag.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level2_room_features;
        }
      });

      // Level 5: Style & Cultural Score
      const style = queryAnalysis.components.style;
      const cultural = queryAnalysis.components.cultural;
      const styleTags = this.getStyleTags(payload);
      const culturalTags = this.getCulturalTags(payload);

      style.forEach((s) => {
        if (
          styleTags.some(
            (tag) =>
              tag?.toLowerCase().includes(s.toLowerCase()) ||
              s.toLowerCase().includes(tag?.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level5_style_cultural;
        }
      });

      cultural.forEach((c) => {
        if (
          culturalTags.some(
            (tag) =>
              tag?.toLowerCase().includes(c.toLowerCase()) ||
              c.toLowerCase().includes(tag?.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level5_style_cultural;
        }
      });

      // Level 1: Room Type Score (LOWEST PRIORITY for furniture queries)
      const roomType = this.getRoomType(payload);
      if (roomType && queryAnalysis.components.room_type.detected) {
        const detectedRoom = queryAnalysis.components.room_type.detected;
        if (
          roomType.toLowerCase().includes(detectedRoom.toLowerCase()) ||
          detectedRoom.toLowerCase().includes(roomType.toLowerCase())
        ) {
          totalScore += this.hierarchicalWeights.level1_room_type * 0.5; // Half weight for furniture queries
        }
      }
    } else {
      // Regular room-based query scoring (original logic)
      // Level 1: Room Type Score
      const roomType = this.getRoomType(payload);
      if (roomType && queryAnalysis.components.room_type.detected) {
        const detectedRoom = queryAnalysis.components.room_type.detected;
        if (
          roomType.toLowerCase().includes(detectedRoom.toLowerCase()) ||
          detectedRoom.toLowerCase().includes(roomType.toLowerCase())
        ) {
          totalScore += this.hierarchicalWeights.level1_room_type;
        }
      }

      // Level 2: Room Features Score
      const roomFeatures = queryAnalysis.components.room_features;
      const roomFeatureTags = this.getRoomFeatureTags(payload);
      roomFeatures.forEach((feature) => {
        if (
          roomFeatureTags.some(
            (tag) =>
              tag.toLowerCase().includes(feature.toLowerCase()) ||
              feature.toLowerCase().includes(tag.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level2_room_features;
        }
      });

      // Level 3: Objects Score
      const objects = queryAnalysis.components.objects;
      const objectTypes = this.getObjectTypes(payload);
      objects.forEach((object) => {
        if (
          objectTypes.some(
            (objType) =>
              objType.toLowerCase().includes(object.toLowerCase()) ||
              object.toLowerCase().includes(objType.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level3_objects_furniture;
        }
      });

      // Level 4: Object Features Score
      const objectFeatures = queryAnalysis.components.object_features;
      const allTags = this.getAllTags(payload);
      objectFeatures.forEach((feature) => {
        if (
          allTags.some(
            (tag) =>
              tag.toLowerCase().includes(feature.toLowerCase()) ||
              feature.toLowerCase().includes(tag.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level4_object_features;
        }
      });

      // Level 5: Style & Cultural Score
      const style = queryAnalysis.components.style;
      const cultural = queryAnalysis.components.cultural;
      const styleTags = this.getStyleTags(payload);
      const culturalTags = this.getCulturalTags(payload);

      style.forEach((s) => {
        if (
          styleTags.some(
            (tag) =>
              tag?.toLowerCase().includes(s.toLowerCase()) ||
              s.toLowerCase().includes(tag?.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level5_style_cultural;
        }
      });

      cultural.forEach((c) => {
        if (
          culturalTags.some(
            (tag) =>
              tag?.toLowerCase().includes(c.toLowerCase()) ||
              c.toLowerCase().includes(tag?.toLowerCase())
          )
        ) {
          totalScore += this.hierarchicalWeights.level5_style_cultural;
        }
      });
    }

    return totalScore;
  }

  // Helper Methods for Enhanced Query Analysis
  detectQueryIntent(query, aiRoomDetection, aiKeywords) {
    // Rely entirely on AI detection - no hardcoded logic
    if (aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.8) {
      return "room_focused";
    } else if (aiRoomDetection?.isFurnitureQuery) {
      return "object_focused";
    } else if (aiKeywords && typeof aiKeywords === "object") {
      // Check if AI extracted any categorized keywords
      const hasCultural =
        aiKeywords.cultural_room && aiKeywords.cultural_room.length > 0;
      const hasStyles = aiKeywords.styles && aiKeywords.styles.length > 0;
      const hasMaterials =
        aiKeywords.materials && aiKeywords.materials.length > 0;

      if (hasCultural || hasStyles || hasMaterials) {
        return "style_focused";
      }
    }

    return "general";
  }

  detectCulturalWeighting(query, keywords) {
    // Use AI's categorized keywords to detect cultural weighting
    if (keywords && typeof keywords === "object" && keywords.cultural_room) {
      // The AI already categorizes cultural terms properly
      const culturalCount = keywords.cultural_room.length;

      // Higher weighting if more cultural terms were extracted
      if (culturalCount >= 5) return 1.5;
      if (culturalCount >= 2) return 1.2;
      return 1.0;
    }

    // Minimal fallback: no cultural weighting if no AI keywords
    return 1.0;
  }

  extractObjects(queryWords, keywords) {
    // If AI extracted keywords are available, use them for object extraction
    if (keywords && typeof keywords === "object" && keywords.objects) {
      console.log(
        `🎯 Using AI-extracted objects: ${keywords.objects.join(", ")}`
      );

      // Use the AI's 'objects' category directly
      // The AI already categorizes keywords properly, so we trust its judgment
      const extractedObjects = keywords.objects || [];

      console.log(
        `📋 Final AI-extracted objects: ${extractedObjects.join(", ")}`
      );
      return extractedObjects;
    }

    // Fallback: If no AI keywords or not structured response, extract from query words only
    console.log(
      `⚠️ No AI structured keywords available, using query words only`
    );

    // Minimal fallback: return query words as potential objects
    const uniqueObjects = [...new Set(queryWords)];
    console.log(`📋 Final extracted objects: ${uniqueObjects.join(", ")}`);
    return uniqueObjects;
  }

  extractRoomFeatures(queryWords, keywords) {
    // Use AI's categorized keywords - look for 'features' category
    if (keywords && typeof keywords === "object" && keywords.features) {
      return keywords.features || [];
    }

    // Minimal fallback: only basic features
    return queryWords.filter(
      (word) =>
        word.toLowerCase().includes("design") ||
        word.toLowerCase().includes("lighting")
    );
  }

  extractObjectFeatures(queryWords, keywords) {
    // Use AI's categorized keywords - look for material/color features
    if (keywords && typeof keywords === "object") {
      const materials = keywords.materials || [];
      const colors = keywords.colors || [];
      return [...materials, ...colors];
    }

    // Minimal fallback: only basic features
    return queryWords.filter(
      (word) =>
        word.toLowerCase().includes("material") ||
        word.toLowerCase().includes("color")
    );
  }

  extractStyle(queryWords, keywords) {
    // Use AI's categorized keywords - look for 'styles' category
    if (keywords && typeof keywords === "object" && keywords.styles) {
      return keywords.styles || [];
    }

    // Minimal fallback: only basic styles
    return queryWords.filter(
      (word) =>
        word.toLowerCase().includes("modern") ||
        word.toLowerCase().includes("traditional")
    );
  }

  extractCultural(queryWords, keywords) {
    // Use AI's categorized keywords - look for 'cultural_room' category
    if (keywords && typeof keywords === "object" && keywords.cultural_room) {
      return keywords.cultural_room || [];
    }

    // Minimal fallback: only basic cultural terms
    return queryWords.filter(
      (word) =>
        word.toLowerCase().includes("indian") ||
        word.toLowerCase().includes("traditional")
    );
  }

  getRoomFeatureTags(payload) {
    return [
      ...(payload.tags?.primary_features || []),
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
      ...(payload.search_tags || []),
    ].filter(Boolean);
  }

  /**
   * Helper Methods for Data Extraction
   */
  getRoomType(payload) {
    return (
      payload.ai_generated_tags?.room ||
      payload.original_analysis?.ai_generated_tags?.room ||
      payload.room_type
    );
  }

  getAllTags(payload) {
    return [
      ...(payload.tags?.colors || []),
      ...(payload.tags?.materials || []),
      ...(payload.tags?.primary_features || []),
      ...(payload.tags?.object_types || []),
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
      ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
      ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.materials || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
        ?.colors || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes
        ?.materials || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
        (obj) => obj.type
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.materials || []
      ) || []),
      ...(payload.search_tags || []),
    ].filter(Boolean);
  }

  getObjectTypes(payload) {
    return [
      ...(payload.tags?.object_types || []),
      ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
        (obj) => obj.type
      ) || []),
    ].filter(Boolean);
  }

  getStyleTags(payload) {
    return [
      payload.tags?.regional_style,
      payload.ai_generated_tags?.theme,
      payload.original_analysis?.ai_generated_tags?.theme,
      ...(payload.indian_context?.traditional_elements || []),
      ...(payload.indian_context?.modern_adaptations || []),
      payload.indian_context?.cultural_significance,
      ...(payload.ai_generated_tags?.indian_context?.traditional_elements ||
        []),
      ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),
      payload.ai_generated_tags?.indian_context?.cultural_significance,
      ...(payload.original_analysis?.ai_generated_tags?.indian_context
        ?.traditional_elements || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context
        ?.modern_adaptations || []),
      payload.original_analysis?.ai_generated_tags?.indian_context
        ?.cultural_significance,
    ].filter(Boolean);
  }

  getCulturalTags(payload) {
    return [
      ...(payload.indian_context?.traditional_elements || []),
      ...(payload.indian_context?.modern_adaptations || []),
      payload.indian_context?.cultural_significance,
      ...(payload.ai_generated_tags?.indian_context?.traditional_elements ||
        []),
      ...(payload.ai_generated_tags?.indian_context?.modern_adaptations || []),
      payload.ai_generated_tags?.indian_context?.cultural_significance,
      ...(payload.original_analysis?.ai_generated_tags?.indian_context
        ?.traditional_elements || []),
      ...(payload.original_analysis?.ai_generated_tags?.indian_context
        ?.modern_adaptations || []),
      payload.original_analysis?.ai_generated_tags?.indian_context
        ?.cultural_significance,
    ].filter(Boolean);
  }

  formatEnhancedResult(result) {
    const payload = result.payload;

    const consolidatedResult = {
      image_id: result.id,
      image_url: payload.image_url,
      score: result.score,
      comprehensive_score: result.comprehensive_score || 0,
      room_type: this.getRoomType(payload),
      design_theme:
        payload.ai_generated_tags?.theme ||
        payload.original_analysis?.ai_generated_tags?.theme ||
        payload.design_theme,
      budget_category: payload.budget_category,
      space_type: payload.space_type,
      tags: {
        ...payload.tags,
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
      search_tags: payload.search_tags || [],
    };

    return consolidatedResult;
  }

  getMatchedFields(query, results) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 2);

    return results.map((result) => {
      const payload = result.payload;
      const matchedFields = [];

      const allFields = {
        room_type: this.getRoomType(payload),
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
   * Detect if query is about furniture/objects
   */
  isFurnitureQuery(query, aiRoomDetection, aiKeywords) {
    // Rely entirely on AI's detection - no hardcoded logic
    if (aiRoomDetection?.isFurnitureQuery) {
      return true;
    }

    // Only minimal fallback if AI detection is not available
    if (!aiRoomDetection) {
      console.log(`⚠️ No AI room detection available, using minimal fallback`);
      // Trust the query words as fallback
      return (
        query.toLowerCase().includes("unit") ||
        query.toLowerCase().includes("furniture")
      );
    }

    return false;
  }
}

export default new ImageService();

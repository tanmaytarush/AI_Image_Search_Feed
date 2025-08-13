import path, { dirname } from "path";
import { fileURLToPath } from "url";
import {
  constructImageUrl,
  extractPrimarySearchTerms,
  getValidatedEmbedding,
} from "../utils/imageServiceUtils.js";
import qdrantService from "./qdrantService.js";
import roomIntelligenceService from "./roomIntelligenceService.js";
import searchIntelligenceService from "./searchIntelligenceService.js";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ImageService {
  constructor() {
    // Services are imported statically
    this.imageIdToUrl = null; // cache for image_id to image_url mapping
    this.imageUrlCsvPath = path.join(
      __dirname,
      "../data/interior-image-urls.csv"
    );
  }

  async getAllImages() {
    try {
      const results = await qdrantService.client.scroll(
        "interior_images_description",
        {
          limit: 100,
          with_payload: true,
          with_vector: false,
        }
      );

      const imagesWithUrls = [];
      for (const point of results.points) {
        const imageUrl = await constructImageUrl(point.id, point.payload);
        imagesWithUrls.push({
          image_id: point.id,
          image_url: imageUrl,
          ...point.payload,
        });
      }

      return imagesWithUrls;
    } catch (error) {
      console.error("Error getting all images:", error);
      throw new Error("Failed to get images");
    }
  }

  /**
   * Enhanced search that searches across all AI-generated tags and attributes
   */
  async searchImages(query, limit = 100) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error("Search query is required");
      }

      console.log(`🤖 Streamlined 4-vector search for: "${query}"`);

      // Use search intelligence service to detect exact search intent
      const enhancedQuery = await searchIntelligenceService.enhanceSearchQuery(
        query.trim()
      );
      const isExactSearch = enhancedQuery.exact_search?.enabled || false;

      // Extract primary search terms for context preservation
      const primaryTerms = extractPrimarySearchTerms(query.trim());
      console.log(`🎯 Primary search terms: ${primaryTerms.join(", ")}`);

      // Generate embeddings for ALL 4 vector fields
      const embeddings = await this.generateMultiModalEmbeddings(query.trim());

      // Perform single 4-vector search (covers all aspects)
      const multiVectorResults = await this.performMultiVectorSearch(
        embeddings,
        limit * 2 // Get more results for better ranking
      );

      // Perform exact search for precise matches (keep this as it's different logic)
      const exactLimit = isExactSearch ? limit * 2 : limit;
      const exactResults = await this.performExactSearch(
        query.trim(),
        exactLimit
      );

      // Merge results (much simpler now)
      const allResults = [...multiVectorResults, ...exactResults];
      const uniqueResults = this.removeDuplicates(allResults);

      // Sort by Qdrant's similarity scores (trust the vector math)
      const sortedResults = uniqueResults.sort((a, b) => b.score - a.score);

      // Format results
      const formattedResults = [];
      for (const result of sortedResults.slice(0, limit)) {
        const formatted = await this.formatEnhancedResult(result);
        formattedResults.push(formatted);
      }

      // Generate search metadata
      const searchMetadata = {
        query: query.trim(),
        total_results: formattedResults.length,
        search_strategy: isExactSearch
          ? "exact_search_enhanced"
          : "streamlined_4_vector_search",
        search_components: {
          total_4_vector_searched: multiVectorResults.length,
          total_exact_searched: exactResults.length,
          vectors_used: [
            "primary_search",
            "semantic_desc",
            "object_focus",
            "visual_features",
          ],
          vector_weights: {
            primary_search: "40%",
            semantic_desc: "30%",
            object_focus: "20%",
            visual_features: "10%",
          },
        },
        exact_search_enabled: isExactSearch,
        exact_search_confidence: enhancedQuery.exact_search?.confidence || 0,
        primary_terms: primaryTerms,
        context_preservation: true,
      };

      return {
        images: formattedResults,
        message: `Found ${
          formattedResults.length
        } relevant results for "${query.trim()}" using 4-vector search`,
        search_metadata: searchMetadata,
      };
    } catch (error) {
      console.error("Error in searchImages:", error);
      throw error;
    }
  }

  /**
   * Generate multi-modal embeddings for different search aspects
   */
  async generateMultiModalEmbeddings(query) {
    try {
      // Generate embeddings for all 4 vector fields
      const [
        primaryEmbedding,
        semanticEmbedding,
        featureEmbedding,
        visualEmbedding,
      ] = await Promise.all([
        getValidatedEmbedding(query, "primary_search"),
        getValidatedEmbedding(query, "semantic_search"),
        getValidatedEmbedding(query, "feature_search"),
        getValidatedEmbedding(query, "visual_search"),
      ]);

      return {
        primary: primaryEmbedding,
        semantic: semanticEmbedding,
        feature: featureEmbedding,
        visual: visualEmbedding,
      };
    } catch (error) {
      console.error("Error generating multi-modal embeddings:", error);
      // Fallback to single embedding for all fields
      const fallbackEmbedding = await getValidatedEmbedding(
        query,
        "search_query"
      );
      return {
        primary: fallbackEmbedding,
        semantic: fallbackEmbedding,
        feature: fallbackEmbedding,
        visual: fallbackEmbedding,
      };
    }
  }

  /**
   * Perform multi-vector AI search using ALL 4 available vector fields
   */
  async performMultiVectorSearch(embeddings, limit) {
    try {
      const searchPromises = [
        // Primary search vector (40% weight)
        qdrantService.client.search("interior_images_description", {
          vector: { name: "primary_search", vector: embeddings.primary },
          limit: Math.ceil(limit * 0.4),
          with_payload: true,
          with_vector: false,
        }),

        // Semantic description vector (30% weight)
        qdrantService.client.search("interior_images_description", {
          vector: { name: "semantic_desc", vector: embeddings.semantic },
          limit: Math.ceil(limit * 0.3),
          with_payload: true,
          with_vector: false,
        }),

        // Object focus vector (20% weight)
        qdrantService.client.search("interior_images_description", {
          vector: { name: "object_focus", vector: embeddings.feature },
          limit: Math.ceil(limit * 0.2),
          with_payload: true,
          with_vector: false,
        }),

        // Visual features vector (10% weight)
        qdrantService.client.search("interior_images_description", {
          vector: { name: "visual_features", vector: embeddings.visual },
          limit: Math.ceil(limit * 0.1),
          with_payload: true,
          with_vector: false,
        }),
      ];

      const results = await Promise.all(searchPromises);
      return results.flat();
    } catch (error) {
      console.error("Error in multi-vector search:", error);
      return [];
    }
  }

  /**
   * Perform exact search for precise matches
   */
  async performExactSearch(query, limit) {
    try {
      console.log(`🔍 Performing exact search for: "${query}"`);

      // Use QdrantService's exact search method
      const exactResults = await qdrantService.exactSearch(query, limit);

      console.log(`✅ Exact search found ${exactResults.length} exact matches`);
      return exactResults;
    } catch (error) {
      console.error("Error in exact search:", error);
      return [];
    }
  }

  /**
   * Format result with enhanced information
   */
  async formatEnhancedResult(result) {
    try {
      const payload = result.payload;

      // Return Qdrant payload directly with minimal formatting
      const consolidatedResult = {
        id: result.id,
        score: result.score,
        image_id: payload?.original_id || result.id,
        image_url: payload?.image_url, // Direct from Qdrant payload
        ai_relevance_score: result.aiRelevanceScore || 0,
        exact_match: result.exactMatchBoost || false,
        search_count: result.searchCount || 1,
        vector_matches: result.vectorMatches || [],
        tag_match_score: result.exactMatchScore || 0,

        // Core metadata
        room_type:
          payload.analysis?.ai_generated_tags?.room || payload.room_type,
        design_theme:
          payload.analysis?.ai_generated_tags?.theme || payload.design_theme,
        budget_category: payload.budget_category,
        space_type: payload.space_type,

        // Rich AI-generated tags
        tags: {
          colors:
            payload.analysis?.ai_generated_tags?.visual_attributes?.colors ||
            [],
          materials:
            payload.analysis?.ai_generated_tags?.visual_attributes?.materials ||
            [],
          primary_features:
            payload.analysis?.ai_generated_tags?.primary_features || [],
          object_types:
            payload.analysis?.ai_generated_tags?.objects?.map(
              (obj) => obj.type
            ) || [],
        },

        // Rich AI-generated data
        objects: payload.analysis?.ai_generated_tags?.objects || [],
        visual_attributes:
          payload.analysis?.ai_generated_tags?.visual_attributes || {},
        indian_context:
          payload.analysis?.ai_generated_tags?.indian_context ||
          payload.indian_context ||
          {},
        confidence_scores:
          payload.analysis?.ai_generated_tags?.confidence_scores ||
          payload.confidence_scores ||
          {},
        description:
          payload.analysis?.ai_generated_tags?.description ||
          payload.analysis?.description ||
          "",
        metadata:
          payload.analysis?.ai_generated_tags?.metadata ||
          payload.analysis?.metadata ||
          {},
        search_tags: payload.search_tags || [],

        // Raw payload for advanced use cases
        raw_payload: payload,
      };

      return consolidatedResult;
    } catch (error) {
      console.error("Error formatting result:", error);
      return {
        id: result.id,
        score: result.score || 0,
        image_id: result.payload?.original_id || result.id,
        image_url: result.payload?.image_url || null,
        error: "Failed to format result",
      };
    }
  }

  /**
   * Remove duplicate results by ID
   */
  removeDuplicates(results) {
    const uniqueResults = new Map();

    for (const result of results) {
      if (!uniqueResults.has(result.id)) {
        uniqueResults.set(result.id, result);
      } else {
        // If duplicate found, keep the one with higher score
        const existing = uniqueResults.get(result.id);
        if (result.score > existing.score) {
          uniqueResults.set(result.id, result);
        }
      }
    }

    return Array.from(uniqueResults.values());
  }

  /**
   * Get weight for different search types
   */
  getWeightForSearchType(searchType) {
    const weights = {
      primary_search: 0.4,
      semantic_desc: 0.3,
      object_focus: 0.2,
      visual_features: 0.1,
      exact_match: 0.8,
    };

    return weights[searchType] || 0.1;
  }

  /**
   * Calculate semantic similarity
   */
  calculateSemanticSimilarity(payload, queryLower) {
    const allText = this.getAllTextFromPayload(payload).toLowerCase();
    const queryWords = queryLower.split(/\s+/);

    let similarity = 0;
    for (const word of queryWords) {
      if (allText.includes(word)) {
        similarity += 0.2;
      }
    }

    return Math.min(similarity, 1.0);
  }

  /**
   * Calculate feature relevance
   */
  calculateFeatureRelevance(payload, queryWords) {
    const features = [
      ...(payload.tags?.primary_features || []),
      ...(payload.tags?.object_types || []),
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
    ].map((f) => f.toLowerCase());

    let relevance = 0;
    for (const word of queryWords) {
      if (
        features.some(
          (feature) => feature.includes(word) || word.includes(feature)
        )
      ) {
        relevance += 0.3;
      }
    }

    return Math.min(relevance, 1.0);
  }

  /**
   * Get all text from payload for fuzzy matching
   */
  getAllTextFromPayload(payload) {
    const textParts = [
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
      ...(payload.search_tags || []),
      payload.ai_generated_tags?.room,
      payload.ai_generated_tags?.theme,
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.ai_generated_tags?.metadata?.tags || []),
    ].filter(Boolean);

    return textParts.join(" ");
  }

  /**
   * Enhance query with contextual information using simple pattern matching
   */
  enhanceQueryWithContext(query) {
    const queryLower = query.toLowerCase();

    let enhancedQuery = query;

    // Add feature-specific context using simple pattern matching
    const featureContext = {
      tv: "television entertainment unit living room",
      sofa: "couch seating furniture living room",
      kitchen: "cooking area appliances cabinets",
      bathroom: "washroom toilet bath vanity",
      bedroom: "sleeping room bed furniture",
      marble: "stone granite countertop flooring",
      wood: "wooden timber furniture material",
      modern: "contemporary current design style",
      traditional: "classical heritage indian design",
      minimalist: "minimal simple clean design",
      cabinet: "storage furniture cupboard",
      fabric: "textile material upholstery",
      furniture: "sofa chair table cabinet",
      chair: "seating furniture",
      table: "dining coffee side table",
      lamp: "lighting fixture",
      mirror: "reflective surface",
      curtain: "window treatment drape",
      rug: "carpet floor covering",
      painting: "art wall decoration",
    };

    for (const [feature, context] of Object.entries(featureContext)) {
      if (queryLower.includes(feature)) {
        enhancedQuery += ` ${context}`;
      }
    }

    // Add style modifiers
    const styleModifiers = [
      "modern",
      "traditional",
      "contemporary",
      "classic",
      "luxury",
      "budget",
    ];
    const detectedModifiers = styleModifiers.filter((mod) =>
      queryLower.includes(mod)
    );
    if (detectedModifiers.length > 0) {
      enhancedQuery += ` ${detectedModifiers.join(" ")} design style`;
    }

    // Add room type context if detected
    const roomTypes = [
      "living",
      "bedroom",
      "kitchen",
      "bathroom",
      "dining",
      "office",
      "prayer",
      "entryway",
    ];
    const detectedRooms = roomTypes.filter((room) => queryLower.includes(room));
    if (detectedRooms.length > 0) {
      enhancedQuery += ` ${detectedRooms.join(" ")} room interior design`;
    }

    return enhancedQuery;
  }

  /**
   * Extract feature-specific terms using AI-powered analysis
   */
  async extractFeatureTerms(query) {
    const queryLower = query.toLowerCase();
    const roomTerms = await this.detectRoomTerms(query);

    const featureTerms = [];

    // Extract room-specific features
    if (roomTerms.length > 0) {
      featureTerms.push(...roomTerms.slice(0, 3));
    }

    // Extract specific feature keywords
    const featureKeywords = [
      "kitchen",
      "bathroom",
      "marble",
      "wood",
      "metal",
      "glass",
      "tv",
      "sofa",
      "bed",
      "wardrobe",
      "lighting",
      "storage",
      "modern",
      "traditional",
      "contemporary",
      "minimalist",
      "luxury",
    ];

    for (const keyword of featureKeywords) {
      if (queryLower.includes(keyword)) {
        featureTerms.push(keyword);
      }
    }

    // Add cultural features if detected
    if (
      queryLower.includes("indian") ||
      queryLower.includes("traditional") ||
      queryLower.includes("cultural")
    ) {
      featureTerms.push("indian", "traditional", "cultural");
    }

    return featureTerms.length > 0 ? featureTerms.join(" ") : query;
  }

  /**
   * Detect room terms in a query (simplified version)
   */
  async detectRoomTerms(query) {
    try {
      const queryLower = query.toLowerCase();
      const roomTerms = [];

      // Common room terms
      const roomKeywords = [
        "living room",
        "bedroom",
        "kitchen",
        "dining room",
        "bathroom",
        "study room",
        "puja room",
        "pooja room",
        "mandir",
        "temple",
        "prayer room",
        "worship room",
        "entryway",
        "foyer",
        "vestibule",
        "entrance hall",
        "balcony",
        "terrace",
        "wardrobe",
        "closet",
        "dressing room",
        "home office",
        "study area",
        "utility room",
        "laundry room",
        "storage room",
        "mudroom",
        "pantry",
      ];

      for (const keyword of roomKeywords) {
        if (queryLower.includes(keyword)) {
          roomTerms.push(keyword);
        }
      }

      return roomTerms;
    } catch (error) {
      console.error("Error detecting room terms:", error);
      return [];
    }
  }

  /**
   * Check if a single word matches any tag in the payload
   */
  async checkSingleWordMatch(payload, queryWord) {
    const queryWordLower = queryWord.toLowerCase();

    // Get all searchable tags from payload
    const priorityFields = [
      payload.room_type,
      payload.design_theme,
      payload.space_type,
      payload.ai_generated_tags?.room,
      payload.ai_generated_tags?.theme,
      ...(payload.tags?.primary_features || []),
      ...(payload.tags?.object_types || []),
    ].filter(Boolean);

    const secondaryFields = [
      ...(payload.tags?.colors || []),
      ...(payload.tags?.materials || []),
      ...(payload.tags?.functionality || []),
      ...(payload.tags?.regional_style || []),
      ...(payload.search_tags || []),
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.materials || []
      ) || []),
      ...(payload.ai_generated_tags?.metadata?.tags || []),
      payload.original_analysis?.ai_generated_tags?.theme,
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(
        (obj) => obj.type
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(
        (obj) => obj.features || []
      ) || []),
      ...(payload.original_analysis?.ai_generated_tags?.metadata?.tags || []),
    ].filter(Boolean);

    // First check priority fields (room types) for exact matches
    for (const tag of priorityFields) {
      const tagLower = tag.toLowerCase();
      if (await this.isExactMatch(tagLower, queryWordLower)) {
        return true;
      }
    }

    // Then check secondary fields
    for (const tag of secondaryFields) {
      const tagLower = tag.toLowerCase();
      if (await this.isExactMatch(tagLower, queryWordLower)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check for exact or synonym matches
   */
  async isExactMatch(tagLower, queryWordLower) {
    // Exact match
    if (
      tagLower.includes(queryWordLower) ||
      queryWordLower.includes(tagLower)
    ) {
      return true;
    }

    // Common abbreviations and synonyms
    const synonyms = await this.getSynonyms(queryWordLower);
    if (
      synonyms &&
      Array.isArray(synonyms) &&
      synonyms.some((synonym) => tagLower.includes(synonym))
    ) {
      return true;
    }

    // Check for word boundaries (more precise)
    const tagWords = tagLower.split(/[\s\-_]+/); // Split on spaces, hyphens, and underscores
    return tagWords.some(
      (tagWord) =>
        tagWord === queryWordLower ||
        tagWord.includes(queryWordLower) ||
        queryWordLower.includes(tagWord)
    );
  }

  /**
   * Get synonyms for a word using AI-powered room intelligence
   */
  async getSynonyms(word) {
    try {
      // Use AI-powered room intelligence service for room-related terms
      const isRoomTerm = await roomIntelligenceService.isRoomTerm(word);
      if (isRoomTerm) {
        return await roomIntelligenceService.getRoomSynonyms(word);
      }

      // Fallback to basic synonyms for non-room terms
      const basicSynonyms = {
        tv: ["television", "tv unit", "entertainment unit"],
        sofa: ["couch", "settee", "divan"],
        bed: ["bedroom furniture", "sleeping area"],
        wardrobe: ["closet", "almirah", "cupboard"],
        marble: ["stone", "granite", "quartz"],
        wood: ["wooden", "timber", "lumber"],
        kitchen: "cooking area, kitchen area",
        bathroom: "washroom, toilet, bath",
        washroom: "bathroom, toilet, bath",
        dining: "dining area, dining room, eating area",
        living: "living room, sitting area, lounge",
        bedroom: "sleeping room, bed room",
        pooja: "puja, prayer, worship",
        puja: "pooja, prayer, worship",
        prayer: "pooja, puja, worship",
      };

      return basicSynonyms[word.toLowerCase()] || [];
    } catch (error) {
      console.error("Error getting synonyms for word:", word, error);
      return [];
    }
  }

  /**
   * Enhanced tag matching that handles multi-word queries better
   */
  async checkTagMatchEnhanced(payload, queryWords, queryLower) {
    // Simple room type matching without complex AI detection
    const payloadRoomType = payload.room_type?.toLowerCase() || "";
    const aiRoomType = payload.ai_generated_tags?.room?.toLowerCase() || "";

    // Check if any query word matches the room type
    for (const queryWord of queryWords) {
      const queryWordLower = queryWord.toLowerCase();

      // Check for exact room type matches
      if (
        payloadRoomType.includes(queryWordLower) ||
        queryWordLower.includes(payloadRoomType) ||
        aiRoomType.includes(queryWordLower) ||
        queryWordLower.includes(aiRoomType)
      ) {
        return true;
      }

      // Check for word boundaries in room types
      const roomWords = payloadRoomType.split(/[\s\-_]+/);
      const aiRoomWords = aiRoomType.split(/[\s\-_]+/);

      if (
        roomWords.includes(queryWordLower) ||
        aiRoomWords.includes(queryWordLower)
      ) {
        return true;
      }
    }

    // For multi-word queries, we want to match ALL words
    if (queryWords.length > 1) {
      // Check if ALL words match (AND logic)
      for (const queryWord of queryWords) {
        if (!(await this.checkSingleWordMatch(payload, queryWord))) {
          // If any word doesn't match, try OR logic for better results
          for (const word of queryWords) {
            if (await this.checkSingleWordMatch(payload, word)) {
              return true;
            }
          }
          return false;
        }
      }
      return true;
    } else {
      // For single word queries, match any word
      for (const queryWord of queryWords) {
        if (await this.checkSingleWordMatch(payload, queryWord)) {
          return true;
        }
      }
      return false;
    }
  }
}

export default new ImageService();

import qdrantService from "./qdrantService.js";
import roomIntelligenceService from "./roomIntelligenceService.js";
import embeddingService from "./embeddingService.js";
import searchIntelligenceService from "./searchIntelligenceService.js";
import fs from "fs";
import path from "path";
import csv from "csv-parser";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Get __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class ImageService {
  constructor() {
    // Services are imported statically
    this.imageIdToUrl = null; // cache for image_id to image_url mapping
    this.imageUrlCsvPath = path.join(__dirname, "../data/interior-image-urls.csv");
  }

  async getAllImages() {
    try {
      const results = await qdrantService.client.scroll("interior_images", {
        limit: 100,
        with_payload: true,
        with_vector: false,
      });
      
      const imagesWithUrls = [];
      for (const point of results.points) {
        const imageUrl = await this.constructImageUrl(point.id, point.payload);
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

  async getQueryInsights() {
    return queryIntelligenceService.getQueryInsights();
  }

  /**
   * Enhanced search that searches across all AI-generated tags and attributes
   * This replaces the old searchImages method
   */
  async searchImages(query, limit = 100) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error("Search query is required");
      }

      console.log(`🤖 AI-Heavy search for: "${query}"`);

      // Use search intelligence service to detect exact search intent and enhance query
      const enhancedQuery = await searchIntelligenceService.enhanceSearchQuery(query.trim());
      const isExactSearch = enhancedQuery.exact_search?.enabled || false;

      // Extract primary search terms for context preservation
      const primaryTerms = this.extractPrimarySearchTerms(query.trim());
      console.log(`🎯 Primary search terms: ${primaryTerms.join(', ')}`);

      // Generate multiple embeddings for different aspects
      const embeddings = await this.generateMultiModalEmbeddings(query.trim());
      
      // Perform multi-vector AI search
      const aiSearchResults = await this.performMultiVectorSearch(embeddings, limit * 3);
      
      // Perform semantic text search
      const semanticResults = await this.performSemanticSearch(query.trim(), limit * 2);
      
      // Perform feature-focused search
      const featureResults = await this.performFeatureSearch(query.trim(), limit * 2);
      
      // Perform visual feature search
      const visualResults = await this.performVisualFeatureSearch(query.trim(), limit);
      
      // Perform exact search for precise matches (with higher priority for exact search intent)
      const exactLimit = isExactSearch ? limit * 3 : limit * 2;
      const exactResults = await this.performExactSearch(query.trim(), exactLimit);
      
      // Perform context-preserving search for primary terms
      const contextResults = await this.performContextPreservingSearch(primaryTerms, limit * 2);
      
      // Merge and rank all results using AI with context preservation
      const mergedResults = await this.mergeAndRankResultsWithContext(
        aiSearchResults, 
        semanticResults, 
        featureResults, 
        visualResults,
        exactResults,
        contextResults,
        query.trim(),
        primaryTerms
      );

      // Apply intelligent filtering with context preservation
      const filteredResults = await this.applyIntelligentFilteringWithContext(mergedResults, query.trim(), primaryTerms);
      
      // Sort by AI-calculated relevance with context priority
      const sortedResults = this.sortByAIRelevanceWithContext(filteredResults, query.trim(), primaryTerms);
      
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
        search_strategy: isExactSearch ? "exact_search_enhanced" : "ai_heavy_multi_modal_search_with_context",
        search_components: {
          total_ai_searched: aiSearchResults.length,
          total_semantic_searched: semanticResults.length,
          total_feature_searched: featureResults.length,
          total_visual_searched: visualResults.length,
          total_exact_searched: exactResults.length,
          total_context_searched: contextResults.length
        },
        exact_search_enabled: isExactSearch,
        exact_search_confidence: enhancedQuery.exact_search?.confidence || 0,
        primary_terms: primaryTerms,
        context_preservation: true
      };

      return {
        images: formattedResults,
        message: `Found ${formattedResults.length} relevant results for "${query.trim()}"`,
        search_metadata: searchMetadata
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
      // Generate embeddings for different search strategies
      const [primaryEmbedding, semanticEmbedding, featureEmbedding] = await Promise.all([
        this.getValidatedEmbedding(query, "primary_search"),
        this.getValidatedEmbedding(query, "semantic_search"),
        this.getValidatedEmbedding(query, "feature_search")
      ]);

      return {
        primary: primaryEmbedding,
        semantic: semanticEmbedding,
        feature: featureEmbedding
      };
    } catch (error) {
      console.error("Error generating multi-modal embeddings:", error);
      // Fallback to single embedding
      const fallbackEmbedding = await this.getValidatedEmbedding(query, "search_query");
      return {
        primary: fallbackEmbedding,
        semantic: fallbackEmbedding,
        feature: fallbackEmbedding
      };
    }
  }

  /**
   * Perform multi-vector AI search using all available vector fields
   */
  async performMultiVectorSearch(embeddings, limit) {
    try {
      const searchPromises = [
        // Primary search vector
        qdrantService.client.search("interior_images", {
          vector: { name: "primary_search", vector: embeddings.primary },
          limit: Math.ceil(limit * 0.4),
          with_payload: true,
          with_vector: false,
        }),
        // Semantic description vector
        qdrantService.client.search("interior_images", {
          vector: { name: "semantic_desc", vector: embeddings.semantic },
          limit: Math.ceil(limit * 0.3),
          with_payload: true,
          with_vector: false,
        }),
        // Object focus vector
        qdrantService.client.search("interior_images", {
          vector: { name: "object_focus", vector: embeddings.feature },
          limit: Math.ceil(limit * 0.3),
          with_payload: true,
          with_vector: false,
        })
      ];

      const results = await Promise.all(searchPromises);
      return results.flat();
    } catch (error) {
      console.error("Error in multi-vector search:", error);
      return [];
    }
  }

  /**
   * Perform semantic text search with enhanced context
   */
  async performSemanticSearch(query, limit) {
    try {
      // Enhance query with context for better semantic matching
      const enhancedQuery = this.enhanceQueryWithContext(query);
      const semanticEmbedding = await this.getValidatedEmbedding(enhancedQuery, "semantic_search");
      
      const results = await qdrantService.client.search("interior_images", {
        vector: { name: "semantic_desc", vector: semanticEmbedding },
        limit: limit,
        with_payload: true,
        with_vector: false,
      });

      return results;
    } catch (error) {
      console.error("Error in semantic search:", error);
      return [];
    }
  }

  /**
   * Perform feature-focused search for specific objects and materials
   */
  async performFeatureSearch(query, limit) {
    try {
      // Extract feature-specific terms
      const featureTerms = await this.extractFeatureTerms(query);
      const featureEmbedding = await this.getValidatedEmbedding(featureTerms, "feature_search");
      
      const results = await qdrantService.client.search("interior_images", {
        vector: { name: "object_focus", vector: featureEmbedding },
        limit: limit,
        with_payload: true,
        with_vector: false,
      });

      return results;
    } catch (error) {
      console.error("Error in feature search:", error);
      return [];
    }
  }

  /**
   * Enhance query with contextual information using simple pattern matching
   */
  enhanceQueryWithContext(query) {
    const queryLower = query.toLowerCase();
    
    let enhancedQuery = query;
    
    // Add feature-specific context using simple pattern matching
    const featureContext = {
      'tv': 'television entertainment unit living room',
      'sofa': 'couch seating furniture living room',
      'kitchen': 'cooking area appliances cabinets',
      'bathroom': 'washroom toilet bath vanity',
      'bedroom': 'sleeping room bed furniture',
      'marble': 'stone granite countertop flooring',
      'wood': 'wooden timber furniture material',
      'modern': 'contemporary current design style',
      'traditional': 'classical heritage indian design',
      'minimalist': 'minimal simple clean design',
      'cabinet': 'storage furniture cupboard',
      'fabric': 'textile material upholstery',
      'furniture': 'sofa chair table cabinet',
      'chair': 'seating furniture',
      'table': 'dining coffee side table',
      'lamp': 'lighting fixture',
      'mirror': 'reflective surface',
      'curtain': 'window treatment drape',
      'rug': 'carpet floor covering',
      'painting': 'art wall decoration'
    };
    
    for (const [feature, context] of Object.entries(featureContext)) {
      if (queryLower.includes(feature)) {
        enhancedQuery += ` ${context}`;
      }
    }
    
    // Add style modifiers
    const styleModifiers = ['modern', 'traditional', 'contemporary', 'classic', 'luxury', 'budget'];
    const detectedModifiers = styleModifiers.filter(mod => queryLower.includes(mod));
    if (detectedModifiers.length > 0) {
      enhancedQuery += ` ${detectedModifiers.join(' ')} design style`;
    }
    
    // Add room type context if detected
    const roomTypes = ['living', 'bedroom', 'kitchen', 'bathroom', 'dining', 'office', 'prayer', 'entryway'];
    const detectedRooms = roomTypes.filter(room => queryLower.includes(room));
    if (detectedRooms.length > 0) {
      enhancedQuery += ` ${detectedRooms.join(' ')} room interior design`;
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
      'kitchen', 'bathroom', 'marble', 'wood', 'metal', 'glass',
      'tv', 'sofa', 'bed', 'wardrobe', 'lighting', 'storage',
      'modern', 'traditional', 'contemporary', 'minimalist', 'luxury'
    ];
    
    for (const keyword of featureKeywords) {
      if (queryLower.includes(keyword)) {
        featureTerms.push(keyword);
      }
    }
    
    // Add cultural features if detected
    if (queryLower.includes('indian') || queryLower.includes('traditional') || queryLower.includes('cultural')) {
      featureTerms.push('indian', 'traditional', 'cultural');
    }
    
    return featureTerms.length > 0 ? featureTerms.join(' ') : query;
  }

  // Old mergeAndRankResults method removed - replaced by mergeAndRankResultsWithContext

  /**
   * Get weight for different search types
   */
  getWeightForSearchType(searchType) {
    const weights = {
      primary_search: 0.4,
      semantic_desc: 0.3,
      object_focus: 0.2,
      visual_features: 0.1,
      exact_match: 0.8
    };
    
    return weights[searchType] || 0.1;
  }

  // Old applyIntelligentFiltering method removed - replaced by applyIntelligentFilteringWithContext

  // Old calculateAIRelevanceScore method removed - replaced by calculateAIRelevanceScoreWithContext

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
      ...(payload.ai_generated_tags?.objects?.map(obj => obj.type) || [])
    ].map(f => f.toLowerCase());

    let relevance = 0;
    for (const word of queryWords) {
      if (features.some(feature => feature.includes(word) || word.includes(feature))) {
        relevance += 0.3;
      }
    }
    
    return Math.min(relevance, 1.0);
  }

  // Old sortByAIRelevance method removed - replaced by sortByAIRelevanceWithContext

  /**
   * Perform visual feature search using CNN embeddings
   */
  async performVisualFeatureSearch(query, limit) {
    try {
      // Convert text query to visual feature embedding
      const visualEmbedding = await this.getValidatedEmbedding(query, "visual_search");
      
      const results = await qdrantService.client.search("interior_images", {
        vector: { name: "visual_features", vector: visualEmbedding },
        limit: limit,
        with_payload: true,
        with_vector: false,
      });

      return results;
    } catch (error) {
      console.error("Error in visual feature search:", error);
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
   * Generate AI-powered search insights
   */
  async generateSearchInsights(query, results) {
    const insights = {
      query_analysis: {
        detected_features: await this.extractFeatureTerms(query),
        detected_room_types: await this.extractRoomTypes(query),
        search_intent: this.analyzeSearchIntent(query)
      },
      result_analysis: {
        total_results: results.length,
        room_type_distribution: this.getRoomTypeDistribution(results),
        feature_distribution: this.getFeatureDistribution(results),
        confidence_level: this.calculateConfidenceLevel(results)
      }
    };

    return insights;
  }

  /**
   * Extract room types from query
   */
  async extractRoomTypes(query) {
    // Use local room detection method
    const roomTerms = await this.detectRoomTerms(query);
    
    const detectedRooms = [];
    
    // Extract room types from detected room terms
    for (const roomTerm of roomTerms) {
      detectedRooms.push({
        category: roomTerm,
        relevance: 0.8,
        terms: [roomTerm]
      });
    }
    
    return detectedRooms;
  }

  /**
   * Analyze search intent
   */
  analyzeSearchIntent(query) {
    const queryLower = query.toLowerCase();
    
    if (queryLower.includes('modern') || queryLower.includes('contemporary')) {
      return 'style_preference';
    } else if (queryLower.includes('traditional') || queryLower.includes('classical')) {
      return 'style_preference';
    } else if (queryLower.includes('budget') || queryLower.includes('affordable')) {
      return 'budget_constraint';
    } else if (queryLower.includes('luxury') || queryLower.includes('premium')) {
      return 'budget_constraint';
    } else if (queryLower.includes('tv') || queryLower.includes('sofa') || queryLower.includes('bed')) {
      return 'feature_specific';
    } else {
      return 'general_search';
    }
  }

  /**
   * Get room type distribution from results
   */
  getRoomTypeDistribution(results) {
    const distribution = {};
    results.forEach(result => {
      const roomType = result.payload.room_type || 'unknown';
      distribution[roomType] = (distribution[roomType] || 0) + 1;
    });
    return distribution;
  }

  /**
   * Get feature distribution from results
   */
  getFeatureDistribution(results) {
    const features = {};
    results.forEach(result => {
      const primaryFeatures = result.payload.tags?.primary_features || [];
      primaryFeatures.forEach(feature => {
        features[feature] = (features[feature] || 0) + 1;
      });
    });
    return features;
  }

  /**
   * Calculate confidence level based on result quality
   */
  calculateConfidenceLevel(results) {
    if (results.length === 0) return 'low';
    
    const avgScore = results.reduce((sum, r) => sum + (r.aiRelevanceScore || 0), 0) / results.length;
    
    if (avgScore > 0.8) return 'high';
    if (avgScore > 0.5) return 'medium';
    return 'low';
  }

  /**
   * Filter results by checking if query words match any tag in comprehensive list
   */
  async filterByAllTags(searchResults, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 0); // Allow all words, including short ones like "tv"

    const filteredResults = [];
    for (const result of searchResults) {
      const payload = result.payload;
      if (await this.checkTagMatchEnhanced(payload, queryWords, queryLower)) {
        filteredResults.push(result);
      }
    }
    return filteredResults;
  }

  /**
   * Enhanced tag matching that handles multi-word queries better
   */
  async checkTagMatchEnhanced(payload, queryWords, queryLower) {
    // Simple room type matching without complex AI detection
    const payloadRoomType = payload.room_type?.toLowerCase() || '';
    const aiRoomType = payload.ai_generated_tags?.room?.toLowerCase() || '';
    
    // Check if any query word matches the room type
    for (const queryWord of queryWords) {
      const queryWordLower = queryWord.toLowerCase();
      
      // Check for exact room type matches
      if (payloadRoomType.includes(queryWordLower) || queryWordLower.includes(payloadRoomType) ||
          aiRoomType.includes(queryWordLower) || queryWordLower.includes(aiRoomType)) {
        return true;
      }
      
      // Check for word boundaries in room types
      const roomWords = payloadRoomType.split(/[\s\-_]+/);
      const aiRoomWords = aiRoomType.split(/[\s\-_]+/);
      
      if (roomWords.includes(queryWordLower) || aiRoomWords.includes(queryWordLower)) {
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
      ...(payload.ai_generated_tags?.objects?.flatMap((obj) => obj.features || []) || []),
      ...(payload.ai_generated_tags?.objects?.flatMap((obj) => obj.materials || []) || []),
      ...(payload.ai_generated_tags?.metadata?.tags || []),
      // Check original_analysis structure
      payload.original_analysis?.ai_generated_tags?.theme,
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map((obj) => obj.type) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap((obj) => obj.features || []) || []),
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
    if (tagLower.includes(queryWordLower) || queryWordLower.includes(tagLower)) {
      return true;
    }
    
    // Common abbreviations and synonyms
    const synonyms = await this.getSynonyms(queryWordLower);
    if (synonyms && Array.isArray(synonyms) && synonyms.some(synonym => tagLower.includes(synonym))) {
      return true;
    }
    
    // Check for word boundaries (more precise)
    const tagWords = tagLower.split(/[\s\-_]+/); // Split on spaces, hyphens, and underscores
    return tagWords.some(tagWord => 
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
        'tv': ['television', 'tv unit', 'entertainment unit'],
        'sofa': ['couch', 'settee', 'divan'],
        'bed': ['bedroom furniture', 'sleeping area'],
        'wardrobe': ['closet', 'almirah', 'cupboard'],
        'marble': ['stone', 'granite', 'quartz'],
        'wood': ['wooden', 'timber', 'lumber'],
        'kitchen': ['cooking area', 'kitchen area'],
        'bathroom': ['washroom', 'toilet', 'bath'],
        'washroom': ['bathroom', 'toilet', 'bath'],
        'dining': ['dining area', 'dining room', 'eating area'],
        'living': ['living room', 'sitting area', 'lounge'],
        'bedroom': ['sleeping room', 'bed room'],
        'pooja': ['puja', 'prayer', 'worship'],
        'puja': ['pooja', 'prayer', 'worship'],
        'prayer': ['pooja', 'puja', 'worship']
      };
      
      return basicSynonyms[word.toLowerCase()] || [];
    } catch (error) {
      console.error("Error getting synonyms for word:", word, error);
      return [];
    }
  }

  /**
   * Fuzzy matching for when exact matches fail
   */
  filterByFuzzyMatching(searchResults, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
    
    return searchResults.filter((result) => {
      const payload = result.payload;
      const allText = this.getAllTextFromPayload(payload).toLowerCase();
      
      // Check if any query word appears in the text (fuzzy match)
      return queryWords.some(queryWord => 
        allText.includes(queryWord) || 
        this.calculateSimilarity(queryWord, allText) > 0.7
      );
    });
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
    
    return textParts.join(' ');
  }

  /**
   * Simple similarity calculation
   */
  calculateSimilarity(word1, word2) {
    const longer = word1.length > word2.length ? word1 : word2;
    const shorter = word1.length > word2.length ? word2 : word1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Levenshtein distance calculation
   */
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
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
    const hasMatch = queryWords.some((queryWord) =>
      tagFields.some(
        (tag) => {
          const tagLower = tag.toLowerCase();
          const queryWordLower = queryWord.toLowerCase();
          
          // Exact match
          if (tagLower.includes(queryWordLower) || queryWordLower.includes(tagLower)) {
            return true;
          }
          
          // Partial match for common abbreviations
          if (queryWordLower === 'tv' && tagLower.includes('television')) {
            return true;
          }
          if (queryWordLower === 'television' && tagLower.includes('tv')) {
            return true;
          }
          
          // Check for word boundaries (more flexible matching)
          const tagWords = tagLower.split(/\s+/);
          return tagWords.some(tagWord => 
            tagWord.includes(queryWordLower) || queryWordLower.includes(tagWord)
          );
        }
      )
    );

    // Optional: Add debug logging for specific queries (uncomment if needed)
    // if (queryLower.includes('tv') || queryLower.includes('television')) {
    //   console.log(`🔍 Feature Search Debug for image ${payload.image_id}:`);
    //   console.log(`  Query words: ${queryWords.join(', ')}`);
    //   console.log(`  Has match: ${hasMatch}`);
    // }

    return hasMatch;
  }

  /**
   * Calculate tag match score based on matched fields and their importance
   */
  calculateTagMatchScore(payload, queryWords, queryLower) {
    let score = 0;
    const maxPossibleScore = 100; // Normalize to 0-100 scale
    
    // Track matched categories to avoid double-counting
    const matchedCategories = new Set();
    
    // Check exact matches with higher weight
    if (queryLower.includes(payload.room_type?.toLowerCase())) {
      score += 25; // Room type is very important
      matchedCategories.add('room_type');
    }
    if (queryLower.includes(payload.design_theme?.toLowerCase())) {
      score += 20; // Design theme is important
      matchedCategories.add('design_theme');
    }

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

    // Track unique matches to avoid over-counting
    const uniqueMatches = new Set();
    
    queryWords.forEach((queryWord) => {
      allTags.forEach((tag) => {
        if (
          tag.toLowerCase().includes(queryWord) ||
          queryWord.includes(tag.toLowerCase())
        ) {
          const matchKey = `${queryWord}-${tag}`;
          if (uniqueMatches.has(matchKey)) return; // Skip duplicate matches
          uniqueMatches.add(matchKey);
          
          // Assign weight based on field type with object/room priority (only once per category)
          if (
            !matchedCategories.has('object_types') &&
            (payload.tags?.object_types?.includes(tag) ||
            payload.ai_generated_tags?.objects?.some((obj) => obj.type === tag) ||
            payload.original_analysis?.ai_generated_tags?.objects?.some((obj) => obj.type === tag))
          ) {
            score += 25; // Object types are highest priority
            matchedCategories.add('object_types');
          } else if (
            !matchedCategories.has('primary_features') &&
            (payload.tags?.primary_features?.includes(tag) ||
            payload.ai_generated_tags?.primary_features?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.primary_features?.includes(tag))
          ) {
            score += 20; // Primary features are high priority
            matchedCategories.add('primary_features');
          } else if (
            !matchedCategories.has('materials') &&
            (payload.tags?.materials?.includes(tag) ||
            payload.ai_generated_tags?.visual_attributes?.materials?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials?.includes(tag))
          ) {
            score += 15; // Materials are high priority
            matchedCategories.add('materials');
          } else if (
            !matchedCategories.has('colors') &&
            (payload.tags?.colors?.includes(tag) ||
            payload.ai_generated_tags?.visual_attributes?.colors?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors?.includes(tag))
          ) {
            score += 12; // Colors are medium-high priority
            matchedCategories.add('colors');
          } else if (
            !matchedCategories.has('functionality') &&
            (payload.tags?.functionality === tag ||
            payload.ai_generated_tags?.metadata?.functionality === tag ||
            payload.original_analysis?.ai_generated_tags?.metadata?.functionality === tag)
          ) {
            score += 10; // Functionality is medium priority
            matchedCategories.add('functionality');
          } else if (
            !matchedCategories.has('regional_style') &&
            (payload.tags?.regional_style === tag ||
            payload.ai_generated_tags?.indian_context?.regional_style === tag ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.regional_style === tag)
          ) {
            score += 8; // Regional style is lower priority (style)
            matchedCategories.add('regional_style');
          } else if (
            !matchedCategories.has('traditional_elements') &&
            (payload.indian_context?.traditional_elements?.includes(tag) ||
            payload.ai_generated_tags?.indian_context?.traditional_elements?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.traditional_elements?.includes(tag))
          ) {
            score += 6; // Traditional elements are lower priority (style)
            matchedCategories.add('traditional_elements');
          } else if (
            !matchedCategories.has('modern_adaptations') &&
            (payload.indian_context?.modern_adaptations?.includes(tag) ||
            payload.ai_generated_tags?.indian_context?.modern_adaptations?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.modern_adaptations?.includes(tag))
          ) {
            score += 6; // Modern adaptations are lower priority (style)
            matchedCategories.add('modern_adaptations');
          } else if (
            !matchedCategories.has('cultural_significance') &&
            (payload.indian_context?.cultural_significance === tag ||
            payload.ai_generated_tags?.indian_context?.cultural_significance === tag ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.cultural_significance === tag)
          ) {
            score += 6; // Cultural significance is lower priority (style)
            matchedCategories.add('cultural_significance');
          } else if (payload.search_tags?.includes(tag)) {
            score += 5; // Lower weight for search tags
          } else {
            score += 3; // Default weight for other matches
          }
        }
      });
    });

    // Compound query logic: If multiple query words, require ALL to match for high score
    if (queryWords.length > 1) {
      const matchedQueryWords = new Set();
      
      // Count how many query words were matched
      queryWords.forEach(queryWord => {
        allTags.forEach(tag => {
          if (tag.toLowerCase().includes(queryWord.toLowerCase()) || 
              queryWord.toLowerCase().includes(tag.toLowerCase())) {
            matchedQueryWords.add(queryWord);
          }
        });
      });
      
      // If not all query words matched, reduce score significantly
      if (matchedQueryWords.size < queryWords.length) {
        score = score * (matchedQueryWords.size / queryWords.length) * 0.1; // Much stricter penalty
      }
      
      // For compound queries, require at least 2 words to match
      if (matchedQueryWords.size < Math.min(2, queryWords.length)) {
        score = 0; // No score if not enough words match
      }
    }
    
    // Normalize score to 0-100 range
    return Math.min(score, maxPossibleScore);
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
  async formatEnhancedResult(result) {
    try {
      const payload = result.payload;

      // Consolidate room_type, design_theme, etc. from all structures
      const consolidatedResult = {
        image_id: result.id,
        image_url: await this.constructImageUrl(result.id, payload),
        score: result.score,
        ai_relevance_score: result.aiRelevanceScore || 0,
        exact_match: result.exactMatchBoost || false,
        search_count: result.searchCount || 1,
        vector_matches: result.vectorMatches || [],
        tag_match_score: result.exactMatchScore || 0, // Use the score from the search result
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
    } catch (error) {
      console.error("Error formatting result:", error);
      // Return a basic formatted result if there's an error
      return {
        image_id: result.id,
        image_url: result.payload?.image_url || null,
        score: result.score || 0,
        ai_relevance_score: result.aiRelevanceScore || 0,
        exact_match: result.exactMatchBoost || false,
        search_count: result.searchCount || 1,
        vector_matches: result.vectorMatches || [],
        tag_match_score: result.exactMatchScore || 0,
        room_type: result.payload?.room_type,
        design_theme: result.payload?.design_theme,
        budget_category: result.payload?.budget_category,
        space_type: result.payload?.space_type,
        tags: result.payload?.tags || {},
        indian_context: result.payload?.indian_context || {},
        confidence_scores: result.payload?.confidence_scores || {},
        search_tags: result.payload?.search_tags || [],
      };
    }
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

  /**
   * Validate that all embeddings use 384 dimensions
   */
  validateEmbeddingDimensions(embedding, context = "unknown") {
    if (!Array.isArray(embedding) || embedding.length !== 384) {
      throw new Error(
        `Invalid embedding dimensions in ${context}: expected 384, got ${
          embedding?.length || "undefined"
        }`
      );
    }
    return true;
  }

  /**
   * Get embedding with validation for 384 dimensions
   */
  async getValidatedEmbedding(text, context = "search") {
    const embedding = await qdrantService.getEmbedding(text);
    this.validateEmbeddingDimensions(embedding, context);
    return embedding;
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
   * Extract primary search terms that should be preserved in context
   */
  extractPrimarySearchTerms(query) {
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(word => word.length > 0);
    
    // Define high-priority terms that should be preserved
    const priorityTerms = [
      // Room types
      'foyer', 'entryway', 'living', 'bedroom', 'kitchen', 'bathroom', 'dining', 'study', 'office', 'prayer', 'pooja', 'mandir', 'temple', 'wardrobe', 'closet', 'balcony', 'terrace', 'utility', 'laundry',
      // Specific objects
      'sofa', 'bed', 'table', 'chair', 'cabinet', 'shelf', 'mirror', 'lamp', 'tv', 'television', 'curtain', 'cushion', 'carpet', 'rug',
      // Materials
      'wood', 'leather', 'fabric', 'glass', 'metal', 'marble', 'granite', 'brass', 'copper',
      // Colors
      'white', 'black', 'brown', 'beige', 'blue', 'green', 'red', 'yellow', 'pink', 'purple'
    ];
    
    // Find words that match priority terms
    const primaryTerms = words.filter(word => 
      priorityTerms.some(term => 
        word.includes(term) || term.includes(word)
      )
    );
    
    // If no priority terms found, use the first word as primary
    if (primaryTerms.length === 0 && words.length > 0) {
      primaryTerms.push(words[0]);
    }
    
    return primaryTerms;
  }

  /**
   * Perform context-preserving search for primary terms
   */
  async performContextPreservingSearch(primaryTerms, limit) {
    try {
      console.log(`🎯 Performing context-preserving search for primary terms: ${primaryTerms.join(', ')}`);
      
      const contextResults = [];
      
      for (const primaryTerm of primaryTerms) {
        // Search for each primary term individually
        const termResults = await qdrantService.exactSearch(primaryTerm, limit);
        
        // Boost scores for primary term matches
        const boostedResults = termResults.map(result => ({
          ...result,
          contextPreservationScore: result.exactMatchScore * 1.5, // Boost primary term matches
          primaryTerm: primaryTerm,
          matchType: 'context_preserved'
        }));
        
        contextResults.push(...boostedResults);
      }
      
      console.log(`✅ Context-preserving search found ${contextResults.length} results`);
      return contextResults;
    } catch (error) {
      console.error("Error in context-preserving search:", error);
      return [];
    }
  }

  /**
   * Merge and rank results with context preservation
   */
  async mergeAndRankResultsWithContext(aiResults, semanticResults, featureResults, visualResults, exactResults, contextResults, query, primaryTerms) {
    const allResults = [...aiResults, ...semanticResults, ...featureResults, ...visualResults, ...exactResults, ...contextResults];
    const uniqueResults = new Map();

    // Check if this is an exact search by analyzing the query
    const queryLower = query.toLowerCase();
    const isExactSearch = queryLower.includes('exact') || 
                         queryLower.includes('precise') || 
                         queryLower.includes('specific') ||
                         queryLower.includes('"') ||
                         queryLower.split(/\s+/).length <= 3;

    // Merge results and calculate AI scores with context preservation
    for (const result of allResults) {
      const existing = uniqueResults.get(result.id);
      
      // Determine the search type and weight
      let searchType = 'primary_search';
      let weight = 0.4;
      
      if (result.matchType === 'exact') {
        searchType = 'exact_match';
        weight = isExactSearch ? 0.9 : 0.8;
      } else if (result.matchType === 'context_preserved') {
        searchType = 'context_preserved';
        weight = 1.0; // Highest weight for context-preserved matches
      } else if (result.payload?.embedding_texts?.vector_name) {
        searchType = result.payload.embedding_texts.vector_name;
        weight = this.getWeightForSearchType(searchType);
      }
      
      // Calculate context preservation bonus
      const contextBonus = this.calculateContextPreservationBonus(result, primaryTerms);
      
      if (existing) {
        // Combine scores from different search methods with weights and context bonus
        const currentScore = result.matchType === 'exact' ? result.exactMatchScore : 
                           result.matchType === 'context_preserved' ? result.contextPreservationScore : 
                           result.score;
        
        existing.aiScore = Math.max(existing.aiScore, currentScore * weight * contextBonus);
        existing.searchCount = (existing.searchCount || 0) + 1;
        existing.vectorMatches = existing.vectorMatches || [];
        existing.vectorMatches.push(searchType);
        
        // If this is a context-preserved match, boost the overall score
        if (result.matchType === 'context_preserved') {
          existing.contextPreserved = true;
          existing.aiScore *= 2.0; // High boost for context preservation
        }
        
        // If this is an exact match, boost the overall score
        if (result.matchType === 'exact') {
          existing.exactMatchBoost = true;
          existing.aiScore *= isExactSearch ? 2.0 : 1.5;
        }
      } else {
        const currentScore = result.matchType === 'exact' ? result.exactMatchScore : 
                           result.matchType === 'context_preserved' ? result.contextPreservationScore : 
                           result.score;
        
        uniqueResults.set(result.id, {
          ...result,
          aiScore: currentScore * weight * contextBonus,
          searchCount: 1,
          vectorMatches: [searchType],
          contextPreserved: result.matchType === 'context_preserved',
          exactMatchBoost: result.matchType === 'exact'
        });
      }
    }

    return Array.from(uniqueResults.values());
  }

  /**
   * Calculate context preservation bonus
   */
  calculateContextPreservationBonus(result, primaryTerms) {
    if (primaryTerms.length === 0) return 1.0;
    
    const payload = result.payload;
    const allText = this.getAllTextFromPayload(payload).toLowerCase();
    
    let bonus = 1.0;
    
    // Check if any primary term is present in the result
    for (const primaryTerm of primaryTerms) {
      if (allText.includes(primaryTerm.toLowerCase())) {
        bonus *= 1.5; // Boost for each primary term found
      }
    }
    
    return Math.min(bonus, 3.0); // Cap the bonus at 3x
  }

  /**
   * Apply intelligent filtering with context preservation
   */
  async applyIntelligentFilteringWithContext(results, query, primaryTerms) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

    const filteredResults = [];
    for (const result of results) {
      const payload = result.payload;
      
      // AI-based relevance scoring
      const relevanceScore = await this.calculateAIRelevanceScoreWithContext(payload, queryWords, queryLower, primaryTerms);
      result.aiRelevanceScore = relevanceScore;
      
      // Higher threshold for context preservation
      const threshold = primaryTerms.length > 0 ? 0.2 : 0.3;
      if (relevanceScore > threshold) {
        filteredResults.push(result);
      }
    }
    return filteredResults;
  }

  /**
   * Calculate AI-based relevance score with context preservation
   */
  async calculateAIRelevanceScoreWithContext(payload, queryWords, queryLower, primaryTerms) {
    let score = 0;
    
    // Check exact matches (highest weight)
    if (await this.checkTagMatchEnhanced(payload, queryWords, queryLower)) {
      score += 0.9;
    }
    
    // Check context preservation (very high weight)
    if (primaryTerms.length > 0) {
      const contextScore = this.calculateContextPreservationScore(payload, primaryTerms);
      score += contextScore * 1.5; // Boost context preservation
    }
    
    // Check semantic similarity
    const semanticScore = this.calculateSemanticSimilarity(payload, queryLower);
    score += semanticScore * 0.6;
    
    // Check feature relevance
    const featureScore = this.calculateFeatureRelevance(payload, queryWords);
    score += featureScore * 0.4;
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate context preservation score
   */
  calculateContextPreservationScore(payload, primaryTerms) {
    let score = 0;
    const allText = this.getAllTextFromPayload(payload).toLowerCase();
    
    for (const primaryTerm of primaryTerms) {
      const termLower = primaryTerm.toLowerCase();
      
      // Exact match gets highest score
      if (allText.includes(termLower)) {
        score += 1.0;
      }
      
      // Partial match gets medium score
      const textWords = allText.split(/\s+/);
      if (textWords.some(word => word.includes(termLower) || termLower.includes(word))) {
        score += 0.7;
      }
    }
    
    return Math.min(score / primaryTerms.length, 1.0);
  }

  /**
   * Sort by AI relevance with context priority
   */
  sortByAIRelevanceWithContext(results, query, primaryTerms) {
    const queryLower = query.toLowerCase();
    
    return results.sort((a, b) => {
      // Context-preserved results get highest priority
      if (a.contextPreserved && !b.contextPreserved) return -1;
      if (!a.contextPreserved && b.contextPreserved) return 1;
      
      // Exact matches get second priority
      if (a.exactMatchBoost && !b.exactMatchBoost) return -1;
      if (!a.exactMatchBoost && b.exactMatchBoost) return 1;
      
      // Then sort by AI score
      if (a.aiScore !== b.aiScore) {
        return b.aiScore - a.aiScore;
      }
      
      // Finally by search count (more search methods found it)
      return (b.searchCount || 0) - (a.searchCount || 0);
    });
  }

  /**
   * AI-powered focused search that only returns results for the detected primary room type
   */
  async performFocusedSearch(query, limit = 100) {
    console.log(`🚨 UPDATED CODE IS RUNNING! performFocusedSearch called with query: "${query}"`);
    
    try {
      console.log(`🎯 Performing focused search for: "${query}"`);
      
      // Step 1: AI detects primary room type
      const roomAnalysis = await roomIntelligenceService.detectPrimaryRoomType(query);
      const stylePreferences = await roomIntelligenceService.detectStylePreferences(query);
      
      console.log(`🎯 Detected primary room type: ${roomAnalysis.primaryRoomType} (confidence: ${roomAnalysis.confidence})`);
      console.log(`🎯 Detected styles: ${stylePreferences.join(', ')}`);
      
      if (!roomAnalysis.primaryRoomType || roomAnalysis.confidence < 0.5) {
        console.log("⚠️ No specific room type detected, performing object-specific search");
        return await this.performObjectSpecificSearch(query, limit);
      }
      
      // Step 2: Get focused room concepts for the detected room type
      const focusedConcepts = await roomIntelligenceService.getFocusedRoomConcepts(roomAnalysis.primaryRoomType);
      console.log(`🎯 Focused concepts for ${roomAnalysis.primaryRoomType}:`, focusedConcepts.slice(0, 5));
      
      // Step 3: Perform exact search with room type filter
      const exactResults = await this.performExactSearchWithRoomFilter(query, roomAnalysis.primaryRoomType, limit);
      console.log(`✅ Found ${exactResults.length} exact matches for ${roomAnalysis.primaryRoomType}`);
      
      // Step 4: Perform semantic search with room type filter
      const semanticResults = await this.performSemanticSearchWithRoomFilter(query, roomAnalysis.primaryRoomType, limit);
      console.log(`✅ Found ${semanticResults.length} semantic matches for ${roomAnalysis.primaryRoomType}`);
      
      // Step 5: Merge and rank results
      const mergedResults = this.mergeFocusedResults(exactResults, semanticResults, roomAnalysis, stylePreferences);
      
      // Step 6: Apply final filtering to ensure only relevant room types
      const filteredResults = await this.filterByRoomType(mergedResults, roomAnalysis.primaryRoomType);
      
      // Step 7: Format results
      const formattedResults = [];
      for (const result of filteredResults.slice(0, limit)) {
        const formatted = await this.formatEnhancedResult(result);
        formattedResults.push(formatted);
      }
      
      // Generate search metadata
      const searchMetadata = {
        query: query.trim(),
        total_results: formattedResults.length,
        search_strategy: "focused_room_search",
        detected_room_type: roomAnalysis.primaryRoomType,
        room_confidence: roomAnalysis.confidence,
        detected_styles: stylePreferences,
        search_components: {
          exact_matches: exactResults.length,
          semantic_matches: semanticResults.length
        },
        focused_search: true
      };
      
      return {
        images: formattedResults,
        message: `Found ${formattedResults.length} ${roomAnalysis.primaryRoomType} results for "${query.trim()}"`,
        search_metadata: searchMetadata
      };
    } catch (error) {
      console.error("Error in focused search:", error);
      // Fallback to object-specific search
      return await this.performObjectSpecificSearch(query, limit);
    }
  }

  /**
   * Perform object-specific search when no room type is detected
   * Enhanced version with proper semantic and exact search
   */
  async performObjectSpecificSearch(query, limit = 100) {
    try {
      console.log(`🔍 Performing enhanced object-specific search for: "${query}"`);
      
      // Step 1: Perform semantic search for object queries
      const semanticResults = await this.performSimpleSemanticSearch(query.trim(), limit * 2);
      console.log(`✅ Found ${semanticResults.length} semantic matches for object search`);
      
      // Step 2: Perform exact search for precise object matches
      const exactResults = await this.performSimpleExactSearch(query.trim(), limit * 2);
      console.log(`✅ Found ${exactResults.length} exact matches for object search`);
      
      // Step 3: Perform enhanced object-specific search using object tags
      const objectResults = await this.performObjectTagSearch(query.trim(), limit * 2);
      console.log(`✅ Found ${objectResults.length} object tag matches for object search`);
      
      // Step 4: Merge and rank all results
      const mergedResults = this.mergeObjectSearchResults(semanticResults, exactResults, objectResults, query.trim());
      
      // Step 5: Apply intelligent filtering and ranking
      const filteredResults = this.applyObjectSearchFiltering(mergedResults, query.trim());
      
      // Step 6: Sort by relevance
      const sortedResults = this.sortObjectSearchResults(filteredResults, query.trim());
      
      console.log(`✅ After merging and sorting: ${sortedResults.length} results`);
      
      // Step 7: Format results
      const imageIdToUrl = await this.loadImageIdToUrlMapping();
      const formattedResults = [];
      for (let i = 0; i < sortedResults.length; i++) {
        const result = sortedResults[i];
        try {
          const formatted = {
            image_id: result.id,
            image_url: imageIdToUrl[result.id] || await this.constructImageUrl(result.id, result.payload),
            score: result.score || 0,
            ai_relevance_score: result.aiRelevanceScore || 0,
            exact_match: result.exactMatchBoost || false,
            search_count: result.searchCount || 1,
            vector_matches: result.vectorMatches || [],
            tag_match_score: result.exactMatchScore || 0,
            object_match_score: result.objectMatchScore || 0,
            room_type: result.payload?.room_type,
            design_theme: result.payload?.design_theme,
            budget_category: result.payload?.budget_category,
            space_type: result.payload?.space_type,
            tags: result.payload?.tags || {},
            indian_context: result.payload?.indian_context || {},
            confidence_scores: result.payload?.confidence_scores || {},
            search_tags: result.payload?.search_tags || [],
            matched_objects: result.matchedObjects || [],
            object_relevance: result.objectRelevance || 0,
            original_analysis: result.payload?.original_analysis || null,
            payload: result.payload
          };
          formattedResults.push(formatted);
        } catch (error) {
          console.error(`❌ Error formatting result ${i + 1}:`, error);
        }
      }
      
      console.log(`✅ After formatting: ${formattedResults.length} results`);
      
      // Generate search metadata
      const searchMetadata = {
        query: query.trim(),
        total_results: formattedResults.length,
        search_strategy: "enhanced_object_search",
        detected_room_type: null,
        room_confidence: 0,
        detected_styles: [],
        search_components: {
          semantic_matches: semanticResults.length,
          exact_matches: exactResults.length,
          object_tag_matches: objectResults.length
        },
        focused_search: false,
        object_search: true
      };
      
      return {
        images: formattedResults.slice(0, limit),
        message: `Found ${formattedResults.length} results for "${query.trim()}"`,
        search_metadata: searchMetadata
      };
    } catch (error) {
      console.error("Error in enhanced object-specific search:", error);
      throw error;
    }
  }

  /**
   * Perform object-specific search using object tags and attributes
   */
  async performObjectTagSearch(query, limit) {
    try {
      console.log(`🔍 Performing object tag search for: "${query}"`);
      
      const allPoints = await qdrantService.client.scroll("interior_images", {
        limit: 1000,
        with_payload: true,
        with_vector: false,
      });

      const objectMatches = [];
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

      for (const point of allPoints.points) {
        const payload = point.payload;
        const objectScore = this.calculateObjectMatchScore(payload, queryWords, queryLower);
        
        if (objectScore > 0) {
          objectMatches.push({
            ...point,
            objectMatchScore: objectScore,
            matchedObjects: this.getMatchedObjects(payload, queryWords),
            objectRelevance: this.calculateObjectRelevance(payload, queryWords),
            matchType: 'object_tag'
          });
        }
      }
      
      // Sort by object match score
      objectMatches.sort((a, b) => b.objectMatchScore - a.objectMatchScore);
      
      console.log(`✅ Object tag search found ${objectMatches.length} matches`);
      return objectMatches.slice(0, limit);
    } catch (error) {
      console.error("Error in object tag search:", error);
      return [];
    }
  }

  /**
   * Calculate object match score based on object tags and attributes
   */
  calculateObjectMatchScore(payload, queryWords, queryLower) {
    let score = 0;
    const maxPossibleScore = 100; // Normalize to 0-100 scale
    
    // Track matched categories to avoid double-counting
    const matchedCategories = new Set();
    
    // Extract all object-related tags
    const objectTags = this.extractObjectTags(payload);
    
    // Track unique matches to avoid over-counting
    const uniqueMatches = new Set();
    
    // Check for exact matches
    for (const queryWord of queryWords) {
      for (const tag of objectTags) {
        if (tag.toLowerCase().includes(queryWord) || queryWord.includes(tag.toLowerCase())) {
          const matchKey = `${queryWord}-${tag}`;
          if (uniqueMatches.has(matchKey)) continue; // Skip duplicate matches
          uniqueMatches.add(matchKey);
          
          // Determine tag type and assign weight with object priority (only once per category)
          if (!matchedCategories.has('object_types') && this.isObjectType(tag, payload)) {
            score += 35; // Object types are highest priority for object search
            matchedCategories.add('object_types');
          } else if (!matchedCategories.has('primary_features') && this.isPrimaryFeature(tag, payload)) {
            score += 25; // Primary features are high priority
            matchedCategories.add('primary_features');
          } else if (!matchedCategories.has('materials') && this.isMaterial(tag, payload)) {
            score += 20; // Materials are high priority
            matchedCategories.add('materials');
          } else if (!matchedCategories.has('functionality') && this.isFunctionality(tag, payload)) {
            score += 15; // Functionality is medium-high priority
            matchedCategories.add('functionality');
          } else if (!matchedCategories.has('colors') && this.isColor(tag, payload)) {
            score += 12; // Colors are medium priority
            matchedCategories.add('colors');
          } else if (!matchedCategories.has('visual_attributes')) {
            score += 8; // Visual attributes are lower priority
            matchedCategories.add('visual_attributes');
          }
        }
      }
    }

    // Compound query logic for object search: Require ALL query words to match
    if (queryWords.length > 1) {
      const matchedQueryWords = new Set();
      
      // Count how many query words were matched
      queryWords.forEach(queryWord => {
        objectTags.forEach(tag => {
          if (tag.toLowerCase().includes(queryWord.toLowerCase()) || 
              queryWord.toLowerCase().includes(tag.toLowerCase())) {
            matchedQueryWords.add(queryWord);
          }
        });
      });
      
      // If not all query words matched, reduce score significantly
      if (matchedQueryWords.size < queryWords.length) {
        score = score * (matchedQueryWords.size / queryWords.length) * 0.1; // Much stricter penalty
      }
      
      // For compound queries, require at least 2 words to match
      if (matchedQueryWords.size < Math.min(2, queryWords.length)) {
        score = 0; // No score if not enough words match
      }
    }
    
    // Normalize score to 0-100 range
    return Math.min(score, maxPossibleScore);
  }

  /**
   * Extract all object-related tags from payload
   */
  extractObjectTags(payload) {
    const tags = [];
    
    // Basic tags
    if (payload.tags) {
      tags.push(...(payload.tags.object_types || []));
      tags.push(...(payload.tags.primary_features || []));
      tags.push(...(payload.tags.materials || []));
      tags.push(...(payload.tags.colors || []));
      if (payload.tags.functionality) tags.push(payload.tags.functionality);
    }
    
    // AI generated tags
    if (payload.ai_generated_tags) {
      tags.push(...(payload.ai_generated_tags.objects?.map(obj => obj.type) || []));
      tags.push(...(payload.ai_generated_tags.primary_features || []));
      tags.push(...(payload.ai_generated_tags.visual_attributes?.colors || []));
      tags.push(...(payload.ai_generated_tags.visual_attributes?.materials || []));
      tags.push(...(payload.ai_generated_tags.objects?.flatMap(obj => obj.materials || []) || []));
      tags.push(...(payload.ai_generated_tags.objects?.flatMap(obj => obj.features || []) || []));
    }
    
    // Original analysis tags
    if (payload.original_analysis?.ai_generated_tags) {
      tags.push(...(payload.original_analysis.ai_generated_tags.objects?.map(obj => obj.type) || []));
      tags.push(...(payload.original_analysis.ai_generated_tags.primary_features || []));
      tags.push(...(payload.original_analysis.ai_generated_tags.visual_attributes?.colors || []));
      tags.push(...(payload.original_analysis.ai_generated_tags.visual_attributes?.materials || []));
      tags.push(...(payload.original_analysis.ai_generated_tags.objects?.flatMap(obj => obj.materials || []) || []));
      tags.push(...(payload.original_analysis.ai_generated_tags.objects?.flatMap(obj => obj.features || []) || []));
    }
    
    // Search tags
    if (payload.search_tags) {
      tags.push(...payload.search_tags);
    }
    
    return tags.filter(Boolean);
  }

  /**
   * Check if a tag is an object type
   */
  isObjectType(tag, payload) {
    const objectTypes = [
      ...(payload.tags?.object_types || []),
      ...(payload.ai_generated_tags?.objects?.map(obj => obj.type) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.map(obj => obj.type) || [])
    ];
    return objectTypes.some(objType => objType.toLowerCase() === tag.toLowerCase());
  }

  /**
   * Check if a tag is a primary feature
   */
  isPrimaryFeature(tag, payload) {
    const primaryFeatures = [
      ...(payload.tags?.primary_features || []),
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.original_analysis?.ai_generated_tags?.primary_features || [])
    ];
    return primaryFeatures.some(feature => feature.toLowerCase() === tag.toLowerCase());
  }

  /**
   * Check if a tag is a material
   */
  isMaterial(tag, payload) {
    const materials = [
      ...(payload.tags?.materials || []),
      ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials || []),
      ...(payload.ai_generated_tags?.objects?.flatMap(obj => obj.materials || []) || []),
      ...(payload.original_analysis?.ai_generated_tags?.objects?.flatMap(obj => obj.materials || []) || [])
    ];
    return materials.some(material => material.toLowerCase() === tag.toLowerCase());
  }

  /**
   * Check if a tag is a color
   */
  isColor(tag, payload) {
    const colors = [
      ...(payload.tags?.colors || []),
      ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
      ...(payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors || [])
    ];
    return colors.some(color => color.toLowerCase() === tag.toLowerCase());
  }

  /**
   * Check if a tag is functionality
   */
  isFunctionality(tag, payload) {
    return payload.tags?.functionality?.toLowerCase() === tag.toLowerCase();
  }

  /**
   * Get matched objects for a payload
   */
  getMatchedObjects(payload, queryWords) {
    const matchedObjects = [];
    const objectTags = this.extractObjectTags(payload);
    
    for (const queryWord of queryWords) {
      for (const tag of objectTags) {
        if (tag.toLowerCase().includes(queryWord) || queryWord.includes(tag.toLowerCase())) {
          matchedObjects.push({
            tag: tag,
            queryWord: queryWord,
            type: this.getTagType(tag, payload)
          });
        }
      }
    }
    
    return matchedObjects;
  }

  /**
   * Get the type of a tag
   */
  getTagType(tag, payload) {
    if (this.isObjectType(tag, payload)) return 'object_type';
    if (this.isPrimaryFeature(tag, payload)) return 'primary_feature';
    if (this.isMaterial(tag, payload)) return 'material';
    if (this.isColor(tag, payload)) return 'color';
    if (this.isFunctionality(tag, payload)) return 'functionality';
    return 'visual_attribute';
  }

  /**
   * Calculate object relevance score
   */
  calculateObjectRelevance(payload, queryWords) {
    let relevance = 0;
    const objectTags = this.extractObjectTags(payload);
    
    for (const queryWord of queryWords) {
      for (const tag of objectTags) {
        const similarity = this.calculateSimilarity(queryWord.toLowerCase(), tag.toLowerCase());
        relevance += similarity;
      }
    }
    
    return relevance / Math.max(queryWords.length, 1);
  }

  /**
   * Merge object search results from different search methods
   */
  mergeObjectSearchResults(semanticResults, exactResults, objectResults, query) {
    const merged = new Map();
    
    // Add semantic results
    semanticResults.forEach(result => {
      merged.set(result.id, {
        ...result,
        searchCount: 1,
        vectorMatches: ['semantic'],
        score: result.score || 0
      });
    });
    
    // Add exact results
    exactResults.forEach(result => {
      if (merged.has(result.id)) {
        const existing = merged.get(result.id);
        existing.searchCount = (existing.searchCount || 0) + 1;
        existing.vectorMatches.push('exact');
        existing.score = Math.max(existing.score, result.exactMatchScore || 0);
        existing.exactMatchBoost = true;
      } else {
        merged.set(result.id, {
          ...result,
          searchCount: 1,
          vectorMatches: ['exact'],
          score: result.exactMatchScore || 0,
          exactMatchBoost: true
        });
      }
    });
    
    // Add object results
    objectResults.forEach(result => {
      if (merged.has(result.id)) {
        const existing = merged.get(result.id);
        existing.searchCount = (existing.searchCount || 0) + 1;
        existing.vectorMatches.push('object_tag');
        existing.score = Math.max(existing.score, result.objectMatchScore || 0);
        existing.objectMatchScore = result.objectMatchScore || 0;
        existing.matchedObjects = result.matchedObjects || [];
        existing.objectRelevance = result.objectRelevance || 0;
      } else {
        merged.set(result.id, {
          ...result,
          searchCount: 1,
          vectorMatches: ['object_tag'],
          score: result.objectMatchScore || 0,
          objectMatchScore: result.objectMatchScore || 0,
          matchedObjects: result.matchedObjects || [],
          objectRelevance: result.objectRelevance || 0
        });
      }
    });
    
    return Array.from(merged.values());
  }

  /**
   * Apply intelligent filtering for object search results
   */
  applyObjectSearchFiltering(results, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);
    
    return results.filter(result => {
      // Filter out results with zero scores (from compound query logic)
      if (result.score === 0 && result.objectMatchScore === 0 && result.exactMatchScore === 0) {
        return false;
      }
      
      // Keep results with high object relevance
      if (result.objectRelevance > 0.3) return true;
      
      // Keep results with exact matches
      if (result.exactMatchBoost) return true;
      
      // Keep results with high semantic similarity
      if (result.score > 0.5) return true;
      
      // Keep results with multiple search method matches
      if (result.searchCount > 1) return true;
      
      return false;
    });
  }

  /**
   * Sort object search results by relevance
   */
  sortObjectSearchResults(results, query) {
    return results.sort((a, b) => {
      // Primary sort: object relevance
      const relevanceA = a.objectRelevance || 0;
      const relevanceB = b.objectRelevance || 0;
      if (relevanceA !== relevanceB) return relevanceB - relevanceA;
      
      // Secondary sort: exact match boost
      const exactA = a.exactMatchBoost ? 1 : 0;
      const exactB = b.exactMatchBoost ? 1 : 0;
      if (exactA !== exactB) return exactB - exactA;
      
      // Tertiary sort: search count
      const countA = a.searchCount || 0;
      const countB = b.searchCount || 0;
      if (countA !== countB) return countB - countA;
      
      // Quaternary sort: semantic score
      const scoreA = a.score || 0;
      const scoreB = b.score || 0;
      return scoreB - scoreA;
    });
  }

  /**
   * Perform exact search with room type filter
   */
  async performExactSearchWithRoomFilter(query, roomType, limit) {
    try {
      const allPoints = await qdrantService.client.scroll("interior_images", {
        limit: 1000,
        with_payload: true,
        with_vector: false,
      });

      const exactMatches = [];
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

      for (const point of allPoints.points) {
        const payload = point.payload;
        
        // Check if this result matches the room type
        const roomTypeMatch = await this.checkRoomTypeMatch(payload, roomType);
        if (!roomTypeMatch) continue;
        
        // Calculate exact match score using existing method
        const exactMatchScore = this.calculateTagMatchScore(payload, queryWords, queryLower);
        
        if (exactMatchScore > 0) {
          exactMatches.push({
            ...point,
            exactMatchScore,
            matchType: 'exact',
            roomTypeMatch: true
          });
        }
      }

      exactMatches.sort((a, b) => b.exactMatchScore - a.exactMatchScore);
      return exactMatches.slice(0, limit);
    } catch (error) {
      console.error("Error in exact search with room filter:", error);
      return [];
    }
  }

  /**
   * Perform semantic search with room type filter
   */
  async performSemanticSearchWithRoomFilter(query, roomType, limit) {
    try {
      const embedding = await this.getValidatedEmbedding(query, "semantic_search");
      
      const searchResults = await qdrantService.client.search("interior_images", {
        vector: { name: "semantic_desc", vector: embedding },
        limit: Math.ceil(limit * 2), // Get more results for filtering
        with_payload: true,
        with_vector: false,
      });

      console.log(`🔍 Semantic search returned ${searchResults.length} results before filtering`);
      console.log(`🔍 Target room type: ${roomType}`);

      // Filter by room type and calculate relevance
      const filteredResults = [];
      for (const result of searchResults) {
        const payloadRoomType = result.payload.room_type?.toLowerCase() || '';
        console.log(`🔍 Checking result with room_type: "${payloadRoomType}"`);
        
        // STRICT FILTERING: Only allow exact matches or very close matches
        let roomTypeMatch = false;
        
        // Get room concepts for the target room type
        const targetConcepts = await roomIntelligenceService.getRoomConceptsForCategory(roomType);
        
        // Check for exact matches first
        if (payloadRoomType === roomType) {
          roomTypeMatch = true;
          console.log(`✅ Exact room type match: "${payloadRoomType}" === "${roomType}"`);
        }
        
        // Check if payload room type is in the target concepts
        if (!roomTypeMatch && targetConcepts.some(concept => concept.toLowerCase() === payloadRoomType)) {
          roomTypeMatch = true;
          console.log(`✅ Concept match: "${payloadRoomType}" is in target concepts`);
        }
        
        // Check for partial matches (more strict)
        if (!roomTypeMatch) {
          for (const concept of targetConcepts) {
            const conceptLower = concept.toLowerCase();
            if (payloadRoomType.includes(conceptLower) || conceptLower.includes(payloadRoomType)) {
              roomTypeMatch = true;
              console.log(`✅ Partial match: "${conceptLower}" matches "${payloadRoomType}"`);
              break;
            }
          }
        }
        
        console.log(`🔍 Room type match result: ${roomTypeMatch}`);
        
        if (!roomTypeMatch) {
          console.log(`❌ Filtered out result with room_type: "${payloadRoomType}"`);
          continue;
        }
        
        // Calculate AI relevance score
        const queryWords = query.toLowerCase().split(/\s+/);
        const relevanceScore = await this.calculateAIRelevanceScoreWithContext(
          result.payload, 
          queryWords, 
          query.toLowerCase(),
          [roomType]
        );
        
        result.aiRelevanceScore = relevanceScore;
        result.roomTypeMatch = true;
        
        if (relevanceScore > 0.3) { // Minimum relevance threshold
          filteredResults.push(result);
          console.log(`✅ Added result with room_type: "${payloadRoomType}" and score: ${relevanceScore}`);
        }
      }

      console.log(`🔍 After filtering: ${filteredResults.length} results`);
      filteredResults.sort((a, b) => b.aiRelevanceScore - a.aiRelevanceScore);
      return filteredResults.slice(0, limit);
    } catch (error) {
      console.error("Error in semantic search with room filter:", error);
      return [];
    }
  }

  /**
   * Check if a payload matches the specified room type
   */
  async checkRoomTypeMatch(payload, targetRoomType) {
    try {
      const payloadRoomType = payload.room_type?.toLowerCase() || '';
      const aiRoomType = payload.ai_generated_tags?.room?.toLowerCase() || '';
      
      // Get room concepts for the target room type
      const targetConcepts = await roomIntelligenceService.getRoomConceptsForCategory(targetRoomType);
      const normalizedConcepts = targetConcepts.map(c => c.trim().toLowerCase());
      
      // Split payload room types on '/' and check each part for an exact match
      const payloadRoomTypeParts = payloadRoomType.split('/').map(part => part.trim());
      const aiRoomTypeParts = aiRoomType.split('/').map(part => part.trim());
      
      // Check if any part matches exactly
      for (const part of payloadRoomTypeParts) {
        if (normalizedConcepts.includes(part)) {
          return true;
        }
      }
      for (const part of aiRoomTypeParts) {
        if (normalizedConcepts.includes(part)) {
          return true;
        }
      }
      return false;
    } catch (error) {
      console.error("Error checking room type match:", error);
      return false;
    }
  }

  /**
   * Merge focused search results
   */
  mergeFocusedResults(exactResults, semanticResults, roomAnalysis, stylePreferences) {
    const merged = [];
    const seenIds = new Set();
    
    // Add exact matches first (highest priority)
    for (const result of exactResults) {
      if (!seenIds.has(result.id)) {
        result.searchType = 'exact';
        result.roomType = roomAnalysis.primaryRoomType;
        result.stylePreferences = stylePreferences;
        merged.push(result);
        seenIds.add(result.id);
      }
    }
    
    // Add semantic matches
    for (const result of semanticResults) {
      if (!seenIds.has(result.id)) {
        result.searchType = 'semantic';
        result.roomType = roomAnalysis.primaryRoomType;
        result.stylePreferences = stylePreferences;
        merged.push(result);
        seenIds.add(result.id);
      }
    }
    
    // Sort by relevance
    merged.sort((a, b) => {
      // Exact matches get priority
      if (a.searchType === 'exact' && b.searchType !== 'exact') return -1;
      if (a.searchType !== 'exact' && b.searchType === 'exact') return 1;
      
      // Then by score
      const scoreA = a.exactMatchScore || a.aiRelevanceScore || 0;
      const scoreB = b.exactMatchScore || b.aiRelevanceScore || 0;
      return scoreB - scoreA;
    });
    
    return merged;
  }

  /**
   * Filter results by room type to ensure only relevant results
   */
  async filterByRoomType(results, targetRoomType) {
    const filteredResults = [];
    for (const result of results) {
      const roomTypeMatch = await this.checkRoomTypeMatch(result.payload, targetRoomType);
      if (roomTypeMatch) {
        filteredResults.push(result);
      }
    }
    return filteredResults;
  }

  /**
   * Perform simple exact search without room intelligence dependencies
   */
  async performSimpleExactSearch(query, limit) {
    try {
      console.log(`🔍 Performing simple exact search for: "${query}"`);
      
      const allPoints = await qdrantService.client.scroll("interior_images", {
        limit: 1000,
        with_payload: true,
        with_vector: false,
      });

      console.log(`📊 Total points in database: ${allPoints.points.length}`);

      const exactMatches = [];
      const queryLower = query.toLowerCase();
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

      console.log(`🔍 Query words: ${queryWords.join(', ')}`);

      // Test first few points to see what's in the database
      console.log(`🔍 Testing first 3 points:`);
      for (let i = 0; i < Math.min(3, allPoints.points.length); i++) {
        const point = allPoints.points[i];
        const payload = point.payload;
        const allText = this.getAllTextFromPayload(payload).toLowerCase();
        console.log(`  Point ${i}: room_type="${payload.room_type}", text contains "sofa": ${allText.includes('sofa')}`);
        console.log(`  Sample text: ${allText.substring(0, 200)}...`);
      }

      for (const point of allPoints.points) {
        const payload = point.payload;
        
        // Simple tag matching without complex scoring
        let hasMatch = false;
        const allText = this.getAllTextFromPayload(payload).toLowerCase();
        
        for (const queryWord of queryWords) {
          if (allText.includes(queryWord.toLowerCase())) {
            hasMatch = true;
            console.log(`✅ Found match for "${queryWord}" in: ${payload.room_type}`);
            break;
          }
        }
        
        if (hasMatch) {
          console.log(`✅ Found match: ${payload.room_type} with query: "${query}"`);
          exactMatches.push({
            ...point,
            exactMatchScore: 1, // Simple score
            matchType: 'exact'
          });
        }
      }
      
      // Sort by exact match score
      exactMatches.sort((a, b) => b.exactMatchScore - a.exactMatchScore);
      
      console.log(`✅ Exact search found ${exactMatches.length} exact matches`);
      console.log(`📊 Top 3 scores: ${exactMatches.slice(0, 3).map(r => r.exactMatchScore).join(', ')}`);
      
      return exactMatches.slice(0, limit);
    } catch (error) {
      console.error("Error in simple exact search:", error);
      return [];
    }
  }

  /**
   * Perform simple semantic search without room intelligence dependencies
   */
  async performSimpleSemanticSearch(query, limit) {
    try {
      console.log(`🔍 Performing simple semantic search for: "${query}"`);
      
      // Use the original query without enhancement to avoid issues
      const semanticEmbedding = await this.getValidatedEmbedding(query, "semantic_search");
      
      console.log(`✅ Generated embedding with ${semanticEmbedding.length} dimensions`);
      
      const searchResults = await qdrantService.client.search("interior_images", {
        vector: { name: "semantic_desc", vector: semanticEmbedding },
        limit: limit,
        with_payload: true,
        with_vector: false,
      });
      
      console.log(`✅ Semantic search returned ${searchResults.length} results`);
      return searchResults;
    } catch (error) {
      console.error("Error in simple semantic search:", error);
      return [];
    }
  }

  /**
   * Calculate exact match score for a result
   */
  calculateExactMatchScore(payload, queryWords, queryLower) {
    let score = 0;
    const maxPossibleScore = 100; // Normalize to 0-100 scale
    
    // Track matched categories to avoid double-counting
    const matchedCategories = new Set();
    
    // Check exact matches with higher weight
    if (queryLower.includes(payload.room_type?.toLowerCase())) {
      score += 25; // Room type is very important
      matchedCategories.add('room_type');
    }
    if (queryLower.includes(payload.design_theme?.toLowerCase())) {
      score += 20; // Design theme is important
      matchedCategories.add('design_theme');
    }

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

    // Track unique matches to avoid over-counting
    const uniqueMatches = new Set();
    
    queryWords.forEach((queryWord) => {
      allTags.forEach((tag) => {
        if (
          tag.toLowerCase().includes(queryWord) ||
          queryWord.includes(tag.toLowerCase())
        ) {
          const matchKey = `${queryWord}-${tag}`;
          if (uniqueMatches.has(matchKey)) return; // Skip duplicate matches
          uniqueMatches.add(matchKey);
          
          // Assign weight based on field type (only once per category)
          if (
            !matchedCategories.has('primary_features') &&
            (payload.tags?.primary_features?.includes(tag) ||
            payload.ai_generated_tags?.primary_features?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.primary_features?.includes(tag))
          ) {
            score += 15;
            matchedCategories.add('primary_features');
          } else if (
            !matchedCategories.has('materials') &&
            (payload.tags?.materials?.includes(tag) ||
            payload.ai_generated_tags?.visual_attributes?.materials?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.visual_attributes?.materials?.includes(tag))
          ) {
            score += 12;
            matchedCategories.add('materials');
          } else if (
            !matchedCategories.has('colors') &&
            (payload.tags?.colors?.includes(tag) ||
            payload.ai_generated_tags?.visual_attributes?.colors?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.visual_attributes?.colors?.includes(tag))
          ) {
            score += 10;
            matchedCategories.add('colors');
          } else if (
            !matchedCategories.has('object_types') &&
            (payload.tags?.object_types?.includes(tag) ||
            payload.ai_generated_tags?.objects?.some((obj) => obj.type === tag) ||
            payload.original_analysis?.ai_generated_tags?.objects?.some((obj) => obj.type === tag))
          ) {
            score += 12;
            matchedCategories.add('object_types');
          } else if (
            !matchedCategories.has('functionality') &&
            (payload.tags?.functionality === tag ||
            payload.ai_generated_tags?.metadata?.functionality === tag ||
            payload.original_analysis?.ai_generated_tags?.metadata?.functionality === tag)
          ) {
            score += 8;
            matchedCategories.add('functionality');
          } else if (
            !matchedCategories.has('regional_style') &&
            (payload.tags?.regional_style === tag ||
            payload.ai_generated_tags?.indian_context?.regional_style === tag ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.regional_style === tag)
          ) {
            score += 8;
            matchedCategories.add('regional_style');
          } else if (
            !matchedCategories.has('traditional_elements') &&
            (payload.indian_context?.traditional_elements?.includes(tag) ||
            payload.ai_generated_tags?.indian_context?.traditional_elements?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.traditional_elements?.includes(tag))
          ) {
            score += 6;
            matchedCategories.add('traditional_elements');
          } else if (
            !matchedCategories.has('modern_adaptations') &&
            (payload.indian_context?.modern_adaptations?.includes(tag) ||
            payload.ai_generated_tags?.indian_context?.modern_adaptations?.includes(tag) ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.modern_adaptations?.includes(tag))
          ) {
            score += 6;
            matchedCategories.add('modern_adaptations');
          } else if (
            !matchedCategories.has('cultural_significance') &&
            (payload.indian_context?.cultural_significance === tag ||
            payload.ai_generated_tags?.indian_context?.cultural_significance === tag ||
            payload.original_analysis?.ai_generated_tags?.indian_context?.cultural_significance === tag)
          ) {
            score += 6;
            matchedCategories.add('cultural_significance');
          } else {
            // Default weight for other matches
            score += 3;
          }
        }
      });
    });

    // Normalize score to 0-100 range
    return Math.min(score, maxPossibleScore);
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
        'living room', 'bedroom', 'kitchen', 'dining room', 'bathroom', 'study room',
        'puja room', 'pooja room', 'mandir', 'temple', 'prayer room', 'worship room',
        'entryway', 'foyer', 'vestibule', 'entrance hall', 'balcony', 'terrace',
        'wardrobe', 'closet', 'dressing room', 'home office', 'study area',
        'utility room', 'laundry room', 'storage room', 'mudroom', 'pantry'
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
   * Construct proper image URL from image_id and stored data
   */
  async constructImageUrl(imageId, payload) {
    try {
      // First, try to get the CSV image_id from original_analysis
      const csvImageId = payload?.original_analysis?.image_id;
      
      if (csvImageId) {
        // Load the CSV mapping if not already loaded
        const imageIdToUrl = await this.loadImageIdToUrlMapping();
        
        // Look up the URL using the CSV image_id
        const imageUrl = imageIdToUrl[csvImageId];
        
        if (imageUrl) {
          console.log(`✅ Found image URL for ${imageId} (${csvImageId}): ${imageUrl.substring(0, 50)}...`);
          return imageUrl;
        }
      }
      
      // Fallback: Try multiple possible locations for the image URL
      const possibleUrls = [
        payload?.image_url,
        payload?.original_analysis?.imageUrl,
        payload?.original_analysis?.image_url,
        payload?.ai_generated_tags?.imageUrl,
        payload?.ai_generated_tags?.image_url
      ];
      
      // Find the first valid URL
      const originalUrl = possibleUrls.find(url => url && typeof url === 'string' && url.length > 0);
      
      if (originalUrl) {
        console.log(`✅ Found fallback image URL for ${imageId}: ${originalUrl.substring(0, 50)}...`);
        return originalUrl;
      }
      
      console.warn(`⚠️ No image URL found for image_id: ${imageId}`);
      return null;
    } catch (error) {
      console.error(`Error constructing image URL for ${imageId}:`, error);
      return null;
    }
  }

  /**
   * Load image_id to image_url mapping from CSV (cached)
   */
  async loadImageIdToUrlMapping() {
    if (this.imageIdToUrl) return this.imageIdToUrl;
    const mapping = {};
    return new Promise((resolve, reject) => {
      fs.createReadStream(this.imageUrlCsvPath)
        .pipe(csv())
        .on("data", (row) => {
          if (row.image_id && row.image_url) {
            mapping[row.image_id] = row.image_url;
          }
        })
        .on("end", () => {
          this.imageIdToUrl = mapping;
          resolve(mapping);
        })
        .on("error", reject);
    });
  }
}

export default new ImageService();

import qdrantService from "./qdrantService.js";
import roomIntelligenceService from "./roomIntelligenceService.js";
import embeddingService from "./embeddingService.js";
import searchIntelligenceService from "./searchIntelligenceService.js";

class ImageService {
  constructor() {
    // Services are imported statically
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
        image_url:
          point.payload.image_url ||
          point.payload.original_analysis?.imageUrl ||
          point.payload.original_analysis?.image_url ||
          null,
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

      console.log(`🤖 AI-Heavy search for: "${query}"`);

      // Use search intelligence service to detect exact search intent and enhance query
      const enhancedQuery = await searchIntelligenceService.enhanceSearchQuery(query.trim());
      const isExactSearch = enhancedQuery.exact_search?.enabled || false;

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
      
      // Merge and rank all results using AI
      const mergedResults = await this.mergeAndRankResults(
        aiSearchResults, 
        semanticResults, 
        featureResults, 
        visualResults,
        exactResults,
        query.trim()
      );

      // Apply intelligent filtering
      const filteredResults = this.applyIntelligentFiltering(mergedResults, query.trim());
      
      // Sort by AI-calculated relevance
      const sortedResults = this.sortByAIRelevance(filteredResults, query.trim());

      // Limit results
      const limitedResults = sortedResults.slice(0, parseInt(limit));

      // Generate AI-powered insights
      const searchInsights = await this.generateSearchInsights(query.trim(), limitedResults);

      console.log(`✅ AI-Heavy search completed: ${limitedResults.length} relevant results`);

      return {
        success: true,
        images: limitedResults.map((result) =>
          this.formatEnhancedResult(result)
        ),
        query: query,
        message: `Found ${limitedResults.length} matching images using AI-powered search`,
        search_metadata: {
          total_ai_searched: aiSearchResults.length,
          total_semantic_searched: semanticResults.length,
          total_feature_searched: featureResults.length,
          total_visual_searched: visualResults.length,
          total_exact_searched: exactResults.length,
          total_merged: mergedResults.length,
          total_filtered: limitedResults.length,
          search_strategy: isExactSearch ? "exact_search_enhanced" : "ai_heavy_multi_modal_search_with_exact",
          ai_components: ["multi_vector", "semantic", "feature_focused", "visual_features", "exact_match"],
          exact_search_enabled: isExactSearch,
          exact_search_confidence: enhancedQuery.exact_search?.confidence || 0,
          matched_fields: this.getMatchedFields(query, limitedResults),
          search_insights: searchInsights,
        },
      };
    } catch (error) {
      console.error("AI-Heavy search error:", error);
      throw new Error(`AI search failed: ${error.message}`);
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
      const featureTerms = this.extractFeatureTerms(query);
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
   * Enhance query with contextual information using AI-powered room intelligence
   */
  enhanceQueryWithContext(query) {
    const queryLower = query.toLowerCase();
    const roomDetection = roomIntelligenceService.detectRoomTerms(query);
    
    let enhancedQuery = query;
    
    // Add room-specific context based on AI detection
    if (roomDetection.isRoomSearch || roomDetection.isCompoundRoomSearch) {
      for (const roomType of roomDetection.detectedRoomTypes) {
        const roomTerms = roomIntelligenceService.getRoomConceptsForCategory(roomType.category);
        if (roomTerms.length > 0) {
          enhancedQuery += ` ${roomTerms.slice(0, 2).join(' ')}`;
        }
      }
    }
    
    // Add cultural context if detected
    if (roomDetection.semanticIntent?.culturalContext === 'indian') {
      enhancedQuery += ' indian interior design traditional elements';
    }
    
    // Add style modifiers
    const styleModifiers = ['modern', 'traditional', 'contemporary', 'classic', 'luxury', 'budget'];
    const detectedModifiers = styleModifiers.filter(mod => queryLower.includes(mod));
    if (detectedModifiers.length > 0) {
      enhancedQuery += ` ${detectedModifiers.join(' ')} design style`;
    }
    
    // Add feature-specific context
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
      'minimalist': 'minimal simple clean design'
    };
    
    for (const [feature, context] of Object.entries(featureContext)) {
      if (queryLower.includes(feature)) {
        enhancedQuery += ` ${context}`;
      }
    }
    
    return enhancedQuery;
  }

  /**
   * Extract feature-specific terms using AI-powered analysis
   */
  extractFeatureTerms(query) {
    const queryLower = query.toLowerCase();
    const roomDetection = roomIntelligenceService.detectRoomTerms(query);
    
    const featureTerms = [];
    
    // Extract room-specific features
    if (roomDetection.isRoomSearch || roomDetection.isCompoundRoomSearch) {
      for (const roomType of roomDetection.detectedRoomTypes) {
        const roomTerms = roomIntelligenceService.getRoomConceptsForCategory(roomType.category);
        featureTerms.push(...roomTerms.slice(0, 3));
      }
    }
    
    // Extract compound term features
    for (const compoundTerm of roomDetection.compoundTerms) {
      featureTerms.push(compoundTerm.term);
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
    if (roomDetection.semanticIntent?.culturalContext === 'indian') {
      featureTerms.push('indian', 'traditional', 'cultural');
    }
    
    return featureTerms.length > 0 ? featureTerms.join(' ') : query;
  }

  /**
   * Merge and rank results using AI-based scoring
   */
  async mergeAndRankResults(aiResults, semanticResults, featureResults, visualResults, exactResults, query) {
    const allResults = [...aiResults, ...semanticResults, ...featureResults, ...visualResults, ...exactResults];
    const uniqueResults = new Map();

    // Check if this is an exact search by analyzing the query
    const queryLower = query.toLowerCase();
    const isExactSearch = queryLower.includes('exact') || 
                         queryLower.includes('precise') || 
                         queryLower.includes('specific') ||
                         queryLower.includes('"') ||
                         queryLower.split(/\s+/).length <= 3;

    // Merge results and calculate AI scores
    for (const result of allResults) {
      const existing = uniqueResults.get(result.id);
      
      // Determine the search type and weight
      let searchType = 'primary_search';
      let weight = 0.4;
      
      if (result.matchType === 'exact') {
        searchType = 'exact_match';
        weight = isExactSearch ? 0.9 : 0.8; // Higher weight for exact matches in exact search mode
      } else if (result.payload?.embedding_texts?.vector_name) {
        searchType = result.payload.embedding_texts.vector_name;
        weight = this.getWeightForSearchType(searchType);
      }
      
      if (existing) {
        // Combine scores from different search methods with weights
        const currentScore = result.matchType === 'exact' ? result.exactMatchScore : result.score;
        existing.aiScore = Math.max(existing.aiScore, currentScore * weight);
        existing.searchCount = (existing.searchCount || 0) + 1;
        existing.vectorMatches = existing.vectorMatches || [];
        existing.vectorMatches.push(searchType);
        
        // If this is an exact match, boost the overall score
        if (result.matchType === 'exact') {
          existing.exactMatchBoost = true;
          existing.aiScore *= isExactSearch ? 2.0 : 1.5; // Higher boost for exact search mode
        }
      } else {
        const currentScore = result.matchType === 'exact' ? result.exactMatchScore : result.score;
        uniqueResults.set(result.id, {
          ...result,
          aiScore: currentScore * weight,
          searchCount: 1,
          vectorMatches: [searchType],
          exactMatchBoost: result.matchType === 'exact'
        });
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
      exact_match: 0.8
    };
    
    return weights[searchType] || 0.1;
  }

  /**
   * Apply intelligent filtering based on AI understanding
   */
  applyIntelligentFiltering(results, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 0);

    return results.filter(result => {
      const payload = result.payload;
      
      // AI-based relevance scoring
      const relevanceScore = this.calculateAIRelevanceScore(payload, queryWords, queryLower);
      result.aiRelevanceScore = relevanceScore;
      
      // Filter out low-relevance results
      return relevanceScore > 0.3; // Threshold for relevance
    });
  }

  /**
   * Calculate AI-based relevance score
   */
  calculateAIRelevanceScore(payload, queryWords, queryLower) {
    let score = 0;
    
    // Check exact matches (highest weight)
    if (this.checkTagMatchEnhanced(payload, queryWords, queryLower)) {
      score += 0.9; // Increased weight for exact matches
    }
    
    // Check for exact phrase matches
    const allText = this.getAllTextFromPayload(payload).toLowerCase();
    if (allText.includes(queryLower)) {
      score += 1.0; // Perfect match
    }
    
    // Check for exact word matches in priority fields
    const priorityFields = [
      payload.room_type,
      payload.design_theme,
      payload.space_type,
      ...(payload.tags?.primary_features || []),
      ...(payload.tags?.object_types || []),
      payload.ai_generated_tags?.room,
      payload.ai_generated_tags?.theme
    ].filter(Boolean).map(field => field.toLowerCase());
    
    for (const field of priorityFields) {
      for (const queryWord of queryWords) {
        if (field.includes(queryWord) || queryWord.includes(field)) {
          score += 0.8; // High weight for priority field matches
        }
      }
    }
    
    // Check semantic similarity
    const semanticScore = this.calculateSemanticSimilarity(payload, queryLower);
    score += semanticScore * 0.5; // Reduced weight for semantic matches
    
    // Check feature relevance
    const featureScore = this.calculateFeatureRelevance(payload, queryWords);
    score += featureScore * 0.3; // Reduced weight for feature matches
    
    return Math.min(score, 1.0);
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

  /**
   * Sort by AI-calculated relevance
   */
  sortByAIRelevance(results, query) {
    return results.sort((a, b) => {
      // Primary sort: Exact matches get highest priority
      const aExact = a.exactMatchBoost || false;
      const bExact = b.exactMatchBoost || false;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Secondary sort: AI relevance score
      const scoreDiff = (b.aiRelevanceScore || 0) - (a.aiRelevanceScore || 0);
      if (Math.abs(scoreDiff) > 0.1) return scoreDiff;
      
      // Tertiary sort: Original vector similarity
      const vectorScoreDiff = (b.score || 0) - (a.score || 0);
      if (Math.abs(vectorScoreDiff) > 0.05) return vectorScoreDiff;
      
      // Quaternary sort: Search count (more matches = higher relevance)
      return (b.searchCount || 0) - (a.searchCount || 0);
    });
  }

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
        detected_features: this.extractFeatureTerms(query),
        detected_room_types: this.extractRoomTypes(query),
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
  extractRoomTypes(query) {
    // Use AI-powered room intelligence service
    const roomDetection = roomIntelligenceService.detectRoomTerms(query);
    
    const detectedRooms = [];
    
    // Extract room types from detected room types
    for (const roomType of roomDetection.detectedRoomTypes) {
      detectedRooms.push({
        category: roomType.category,
        relevance: roomType.relevance,
        terms: roomType.primaryTerms
      });
    }
    
    // Also extract from compound terms
    for (const compoundTerm of roomDetection.compoundTerms) {
      detectedRooms.push({
        category: compoundTerm.category,
        relevance: compoundTerm.confidence,
        terms: [compoundTerm.term]
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
  filterByAllTags(searchResults, query) {
    const queryLower = query.toLowerCase();
    const queryWords = queryLower
      .split(/\s+/)
      .filter((word) => word.length > 0); // Allow all words, including short ones like "tv"

    return searchResults.filter((result) => {
      const payload = result.payload;
      return this.checkTagMatchEnhanced(payload, queryWords, queryLower);
    });
  }

  /**
   * Enhanced tag matching that handles multi-word queries better
   */
  checkTagMatchEnhanced(payload, queryWords, queryLower) {
    // Use AI-powered room intelligence service
    const roomDetection = roomIntelligenceService.detectRoomTerms(queryLower);
    
    if (roomDetection.isRoomSearch || roomDetection.isCompoundRoomSearch) {
      // For compound room searches, check the full phrase first
      if (roomDetection.isCompoundRoomSearch) {
        const roomType = payload.room_type?.toLowerCase() || '';
        const aiRoom = payload.ai_generated_tags?.room?.toLowerCase() || '';
        
        // Check each detected compound term
        for (const compoundTerm of roomDetection.compoundTerms) {
          if (queryLower.includes(compoundTerm.term)) {
            // Exact match check
            if (roomType.includes(compoundTerm.term) || aiRoom.includes(compoundTerm.term)) {
              return true;
            }
            
            // Check for partial matches using semantic analysis
            const compoundWords = compoundTerm.term.split(' ');
            const roomWords = roomType.split(/[\s\-_]+/);
            const aiRoomWords = aiRoom.split(/[\s\-_]+/);
            
            // Check if ALL words in the compound term are present in the room type
            const allWordsMatch = compoundWords.every(word => 
              roomWords.includes(word) || aiRoomWords.includes(word)
            );
            
            if (allWordsMatch) {
              return true;
            }
            
            // If this is a compound room search, don't fall back to individual word matching
            // This prevents "puja room" from matching rooms that only contain "room"
            return false;
          }
        }
      }
      
      // For single room word searches, prioritize exact room type matches
      return roomDetection.roomKeywords.some((keyword) => {
        const queryWordLower = keyword.word.toLowerCase();
        const roomType = payload.room_type?.toLowerCase() || '';
        const aiRoom = payload.ai_generated_tags?.room?.toLowerCase() || '';
        
        // Check for exact room type matches first (more precise)
        if (roomType === queryWordLower || queryWordLower === roomType) {
          return true;
        }
        if (aiRoom === queryWordLower || queryWordLower === aiRoom) {
          return true;
        }
        
        // Check for word boundaries in room types
        const roomWords = roomType.split(/[\s\-_]+/);
        const aiRoomWords = aiRoom.split(/[\s\-_]+/);
        
        if (roomWords.includes(queryWordLower) || aiRoomWords.includes(queryWordLower)) {
          return true;
        }
        
        // Then check synonyms using AI service
        const synonyms = roomIntelligenceService.getRoomSynonyms(queryWordLower);
        if (synonyms.some(synonym => roomType.includes(synonym) || aiRoom.includes(synonym))) {
          return true;
        }
        
        return false;
      });
    }
    
    // For multi-word queries, we want to match ALL words
    if (queryWords.length > 1) {
      // Check if ALL words match (AND logic)
      const allWordsMatch = queryWords.every((queryWord) => {
        return this.checkSingleWordMatch(payload, queryWord);
      });
      
      // If all words don't match, try OR logic for better results
      if (!allWordsMatch) {
        const anyWordMatches = queryWords.some((queryWord) => {
          return this.checkSingleWordMatch(payload, queryWord);
        });
        return anyWordMatches;
      }
      
      return allWordsMatch;
    } else {
      // For single word queries, match any word
      return queryWords.some((queryWord) => {
        return this.checkSingleWordMatch(payload, queryWord);
      });
    }
  }

  /**
   * Check if a single word matches any tag in the payload
   */
  checkSingleWordMatch(payload, queryWord) {
    const queryWordLower = queryWord.toLowerCase();
    
    // Get all possible tag fields with priority order
    const priorityFields = [
      payload.room_type,
      payload.ai_generated_tags?.room,
      payload.original_analysis?.ai_generated_tags?.room,
    ].filter(Boolean);
    
    const secondaryFields = [
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
      ...(payload.search_tags || []),
      // Check ai_generated_tags structure
      payload.ai_generated_tags?.theme,
      ...(payload.ai_generated_tags?.primary_features || []),
      ...(payload.ai_generated_tags?.visual_attributes?.colors || []),
      ...(payload.ai_generated_tags?.visual_attributes?.materials || []),
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
    const priorityMatch = priorityFields.some((tag) => {
      const tagLower = tag.toLowerCase();
      return this.isExactMatch(tagLower, queryWordLower);
    });

    if (priorityMatch) {
      return true;
    }

    // Then check secondary fields
    return secondaryFields.some((tag) => {
      const tagLower = tag.toLowerCase();
      return this.isExactMatch(tagLower, queryWordLower);
    });
  }

  /**
   * Check for exact or synonym matches
   */
  isExactMatch(tagLower, queryWordLower) {
    // Exact match
    if (tagLower.includes(queryWordLower) || queryWordLower.includes(tagLower)) {
      return true;
    }
    
    // Common abbreviations and synonyms
    const synonyms = this.getSynonyms(queryWordLower);
    if (synonyms.some(synonym => tagLower.includes(synonym))) {
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
  getSynonyms(word) {
    // Use AI-powered room intelligence service for room-related terms
    if (roomIntelligenceService.isRoomTerm(word)) {
      return roomIntelligenceService.getRoomSynonyms(word);
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
      image_url:
        payload.image_url ||
        payload.original_analysis?.imageUrl ||
        payload.original_analysis?.image_url ||
        null,
      score: result.score,
      ai_relevance_score: result.aiRelevanceScore || 0,
      exact_match: result.exactMatchBoost || false,
      search_count: result.searchCount || 1,
      vector_matches: result.vectorMatches || [],
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
}

export default new ImageService();

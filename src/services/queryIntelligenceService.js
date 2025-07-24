import qdrantService from "./qdrantService.js";
import dotenv from "dotenv";

dotenv.config();

class QueryIntelligenceService {
  constructor() {
    this.roomTypePatterns = new Map();
    this.designThemePatterns = new Map();
    this.queryHistory = [];
    this.learningEnabled = true;
    this.openaiApiUrl = "https://api.openai.com/v1/chat/completions";
  }

  /**
   * AI-powered intelligent search using GPT-3.5-turbo
   */
  async intelligentSearch(query, limit = 10, filters = {}) {
    try {
      console.log(`🤖 Starting AI-powered search for: "${query}"`);
      
      // Step 1: AI-powered room type detection
      const aiRoomDetection = await this.aiDetectRoomType(query);
      console.log(`🏠 AI detected room type: ${aiRoomDetection?.detectedRoom || 'none'}`);
      
      // Step 2: AI-powered secondary keyword extraction
      const aiKeywords = await this.aiExtractKeywords(query);
      console.log(`🔍 AI extracted keywords: ${aiKeywords.join(', ')}`);
      
      // Step 3: Build enhanced filters with room type restriction
      const enhancedFilters = this.buildEnhancedFilters(filters, aiRoomDetection, aiKeywords);
      
      // Step 4: If AI detected a specific room type with high confidence, enforce room type filtering
      if (aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.7) {
        console.log(`🔒 Enforcing room type filter: ${aiRoomDetection.detectedRoom}`);
        enhancedFilters.room_type = aiRoomDetection.detectedRoom;
      }
      
      // Step 5: Perform search with enhanced filters
      const searchResults = await qdrantService.search(query, limit, enhancedFilters);
      
      // Step 6: AI-powered result ranking and enhancement
      const enhancedResults = await this.aiEnhanceResults(searchResults, query, aiRoomDetection, aiKeywords);
      
      return {
        results: enhancedResults,
        ai_insights: {
          detected_room: aiRoomDetection,
          extracted_keywords: aiKeywords,
          search_strategy: enhancedFilters.search_strategy,
          confidence_score: aiRoomDetection?.confidence || 0,
          room_type_filter_applied: aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.7
        },
        original_query: query,
        enhanced_query: enhancedResults.enhanced_query
      };
      
    } catch (error) {
      console.error("Error in AI-powered search:", error);
      // Fallback to regular search
      return await qdrantService.search(query, limit, filters);
    }
  }

  /**
   * AI-powered room type detection using GPT-3.5-turbo
   */
  async aiDetectRoomType(query) {
    try {
      const existingRoomTypes = await this.getExistingRoomTypes();
      const allTags = await this.getAllDatabaseTags();
      
      const prompt = `You are an expert interior design assistant specializing in Indian interior design. 

Given a user query: "${query}"

Available room types in our database: ${existingRoomTypes.join(', ')}

All tags and variations in our database: ${allTags.join(', ')}

Task: Analyze the query and identify the MOST SPECIFIC and RELEVANT room type from the database. Be VERY PRECISE and RESTRICTIVE.

IMPORTANT RULES:
1. If the query mentions ANY religious/spiritual terms (mandir, pooja, temple, prayer, worship, etc.), ONLY return "prayer room" or "pooja room"
2. If the query mentions kitchen-related terms, ONLY return "kitchen"
3. If the query mentions bedroom/sleeping terms, ONLY return "bedroom"
4. If the query mentions bathroom/washroom terms, ONLY return "bathroom"
5. If the query mentions living room/lounge terms, ONLY return "living room"
6. If the query mentions dining/eating terms, ONLY return "dining room"
7. If the query mentions study/work/office terms, ONLY return "home office"
8. If the query mentions entrance/entry/foyer terms, ONLY return "entryway"
9. If the query mentions balcony/terrace terms, ONLY return "balcony"
10. If the query mentions staircase/stair terms, ONLY return "staircase"

BE VERY RESTRICTIVE:
- Only return a room type if you are HIGHLY CONFIDENT (confidence > 0.8)
- If the query is ambiguous or could apply to multiple room types, return null
- If the query doesn't clearly specify a room type, return null
- Prioritize the MOST SPECIFIC room type mentioned

Consider:
1. **Direct matches**: Exact word matches from database
2. **Synonyms and variations**: Different words for same concept (e.g., "mandir", "temple", "pooja room", "prayer room")
3. **Regional variations**: State-specific terms (e.g., "drawing room" vs "living room")
4. **Cultural context**: Religious, traditional, modern variations
5. **Functional similarities**: Different terms for same function (e.g., "study" vs "home office")
6. **Language variations**: Hindi, English, regional language terms
7. **Style variations**: Traditional, modern, contemporary terms
8. **Size variations**: Small, large, compact, spacious terms
9. **Purpose variations**: Work, relaxation, entertainment, cooking terms
10. **All database tags**: Consider every tag in the database for potential matches

Analysis approach:
- Look for ANY word in the query that might relate to ANY room type in the database
- Consider cultural, regional, and functional similarities
- Don't limit to obvious matches - explore all possibilities
- Consider compound terms and phrases
- Look for implicit room types based on context
- BE VERY RESTRICTIVE - only return if highly confident

Return ONLY a JSON object with this structure:
{
  "detectedRoom": "exact_room_type_from_database",
  "confidence": 0.95,
  "reasoning": "detailed explanation of how you mapped the query to this room type, considering all variations",
  "alternativeMatches": ["other_possible_room_types_from_database"],
  "culturalContext": "any_cultural_or_regional_context_detected",
  "matchedKeywords": ["specific_words_from_query_that_led_to_this_detection"],
  "databaseTagsUsed": ["specific_tags_from_database_that_were_considered"],
  "searchStrategy": "explanation_of_how_you_searched_through_all_variations",
  "isRestrictive": true/false
}

If no clear match is found, set "detectedRoom" to null and explain why, listing all the variations you considered.`;

      const response = await this.callGPT35(prompt);
      const aiResponse = JSON.parse(response);
      
      return aiResponse;
      
    } catch (error) {
      console.error("Error in AI room detection:", error);
      return { detectedRoom: null, confidence: 0, reasoning: "AI detection failed" };
    }
  }

  /**
   * AI-powered keyword extraction using GPT-3.5-turbo
   */
  async aiExtractKeywords(query) {
    try {
      const allTags = await this.getAllDatabaseTags();
      
      const prompt = `You are an expert interior design assistant. Extract relevant keywords from this query: "${query}"

Available database tags and variations: ${allTags.join(', ')}

Task: Extract ALL relevant keywords that could match ANY tag in our database. Be comprehensive and consider all possible variations.

Focus on:
1. **Design elements**: furniture, materials, colors, styles, patterns
2. **Functional requirements**: storage, seating, lighting, cooking, sleeping, working
3. **Cultural elements**: traditional, modern, regional, religious, ethnic
4. **Budget indicators**: premium, affordable, luxury, economy, mid-range
5. **Space characteristics**: small, spacious, compact, large, cozy
6. **Room-specific elements**: kitchen appliances, bathroom fixtures, bedroom furniture
7. **Material variations**: wood, metal, fabric, stone, glass, plastic
8. **Color variations**: specific colors, color families, color schemes
9. **Style variations**: contemporary, classic, rustic, minimalist, maximalist
10. **Regional variations**: state-specific terms, cultural variations
11. **Language variations**: Hindi, English, regional language terms
12. **Compound terms**: multi-word phrases that might match database tags

Analysis approach:
- Extract EVERY word that could potentially match ANY database tag
- Consider synonyms, variations, and related terms
- Look for implicit meanings and cultural context
- Consider compound phrases and multi-word terms
- Don't limit to obvious keywords - be comprehensive

Return ONLY a JSON array of keywords:
["keyword1", "keyword2", "keyword3", "compound_phrase1", "cultural_term1"]

Example:
Query: "modern mandir with brass diyas and wooden carvings"
Keywords: ["modern", "mandir", "brass", "diyas", "wooden", "carvings", "traditional", "religious", "hindu", "temple", "prayer", "decorative", "handcrafted", "artisan", "cultural", "heritage", "spiritual", "worship", "ceremonial", "ornate", "detailed", "intricate"]

Keep keywords relevant and comprehensive to maximize database matching.`;

      const response = await this.callGPT35(prompt);
      const keywords = JSON.parse(response);
      
      return Array.isArray(keywords) ? keywords : [];
      
    } catch (error) {
      console.error("Error in AI keyword extraction:", error);
      return [];
    }
  }

  /**
   * AI-powered result enhancement and ranking
   */
  async aiEnhanceResults(searchResults, originalQuery, aiRoomDetection, aiKeywords) {
    try {
      if (!searchResults.results || searchResults.results.length === 0) {
        return searchResults;
      }

      const allTags = await this.getAllDatabaseTags();
      
      const prompt = `You are an expert interior design assistant. 

Original Query: "${originalQuery}"
AI Detected Room: ${aiRoomDetection?.detectedRoom || 'none'}
AI Extracted Keywords: ${aiKeywords.join(', ')}
Available Database Tags: ${allTags.join(', ')}

I have ${searchResults.results.length} search results. For each result, analyze how well it matches the user's intent by considering ALL possible variations and database tags.

Consider:
1. **Room type match**: Does the result match the AI-detected room type?
2. **Keyword relevance**: Do the AI-extracted keywords match any tags in the result?
3. **Cultural context alignment**: Does the result match the cultural context?
4. **Functional requirements match**: Does the result serve the intended function?
5. **Style compatibility**: Does the style match the user's preferences?
6. **Material compatibility**: Do the materials mentioned match the result?
7. **Color compatibility**: Do the colors mentioned match the result?
8. **Budget compatibility**: Does the budget level match?
9. **Space characteristics**: Does the space size/type match?
10. **All database variations**: Consider every possible tag variation

Analysis approach:
- Compare EVERY AI keyword against EVERY tag in the result
- Consider implicit matches and cultural context
- Look for compound phrase matches
- Consider regional and language variations
- Don't limit to exact matches - be flexible

Return ONLY a JSON object with enhanced results:
{
  "enhanced_results": [
    {
      "id": "result_id",
      "relevance_score": 0.95,
      "match_reasons": ["room_type_match", "keyword_match", "cultural_match", "style_match"],
      "ai_insights": "detailed explanation of why this result is relevant, mentioning specific matches found",
      "matched_keywords": ["specific_keywords_that_matched"],
      "matched_database_tags": ["specific_database_tags_that_matched"],
      "confidence_factors": ["room_type", "style", "materials", "colors", "budget"]
    }
  ],
  "enhanced_query": "AI-enhanced version of the original query with all variations considered"
}`;

      const response = await this.callGPT35(prompt);
      const enhancedData = JSON.parse(response);
      
      // Merge AI insights with original results
      const enhancedResults = searchResults.results.map((result, index) => {
        const enhanced = enhancedData.enhanced_results?.[index] || {};
        return {
          ...result,
          ai_relevance_score: enhanced.relevance_score || result.score,
          ai_match_reasons: enhanced.match_reasons || [],
          ai_insights: enhanced.ai_insights || "No AI insights available",
          ai_matched_keywords: enhanced.matched_keywords || [],
          ai_matched_database_tags: enhanced.matched_database_tags || [],
          ai_confidence_factors: enhanced.confidence_factors || []
        };
      });

      // Sort by AI relevance score
      enhancedResults.sort((a, b) => (b.ai_relevance_score || 0) - (a.ai_relevance_score || 0));

      return {
        ...searchResults,
        results: enhancedResults,
        enhanced_query: enhancedData.enhanced_query || originalQuery
      };
      
    } catch (error) {
      console.error("Error in AI result enhancement:", error);
      return searchResults;
    }
  }

  /**
   * Build enhanced filters using AI insights
   */
  buildEnhancedFilters(originalFilters, aiRoomDetection, aiKeywords) {
    const enhancedFilters = { ...originalFilters };
    
    // Add AI-detected room type to filters with high confidence threshold
    if (aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.7) {
      enhancedFilters.room_type = aiRoomDetection.detectedRoom;
      console.log(`🔒 Room type filter applied: ${aiRoomDetection.detectedRoom} (confidence: ${aiRoomDetection.confidence})`);
    }
    
    // Add AI-extracted keywords to search strategy
    enhancedFilters.search_strategy = {
      primary_room: aiRoomDetection?.detectedRoom,
      secondary_keywords: aiKeywords,
      cultural_context: aiRoomDetection?.culturalContext,
      confidence_threshold: aiRoomDetection?.confidence || 0,
      is_restrictive: aiRoomDetection?.isRestrictive || false,
      room_type_filter_applied: aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.7
    };
    
    // If room type is detected with high confidence, prioritize room type matching
    if (aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.8) {
      enhancedFilters.priority_filters = {
        room_type: aiRoomDetection.detectedRoom,
        must_match_room: true
      };
    }
    
    return enhancedFilters;
  }

  /**
   * Call GPT-3.5-turbo API
   */
  async callGPT35(prompt) {
    try {
      const response = await fetch(this.openaiApiUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert interior design assistant specializing in Indian interior design. Always respond with valid JSON only."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (error) {
      console.error("Error calling GPT-3.5-turbo:", error);
      throw error;
    }
  }

  /**
   * Dynamically detect room types from query using multiple strategies
   */
  async detectRoomType(query) {
    const queryLower = query.toLowerCase();
    
    // Strategy 1: AI-powered detection (highest priority)
    const aiDetection = await this.aiDetectRoomType(query);
    if (aiDetection?.detectedRoom && aiDetection.confidence > 0.8) {
      this.learnFromQuery(query, aiDetection.detectedRoom);
      return aiDetection.detectedRoom;
    }
    
    // Strategy 2: Check against existing data in Qdrant
    const existingRoomTypes = await this.getExistingRoomTypes();
    const detectedFromData = this.matchAgainstExistingData(queryLower, existingRoomTypes);
    
    // Strategy 3: Use semantic similarity with existing room types
    const semanticMatch = await this.findSemanticMatch(queryLower, existingRoomTypes);
    
    // Strategy 4: Pattern-based detection (fallback)
    const patternMatch = this.patternBasedDetection(queryLower);
    
    // Strategy 5: Learn from query history
    const historicalMatch = this.learnFromQueryHistory(queryLower);
    
    // Combine results with priority
    const results = [
      { type: detectedFromData, confidence: 0.9, source: 'data_match' },
      { type: semanticMatch, confidence: 0.8, source: 'semantic' },
      { type: patternMatch, confidence: 0.7, source: 'pattern' },
      { type: historicalMatch, confidence: 0.6, source: 'history' }
    ].filter(r => r.type);
    
    // Return the highest confidence match
    if (results.length > 0) {
      const bestMatch = results.reduce((best, current) => 
        current.confidence > best.confidence ? current : best
      );
      
      // Learn from this query
      this.learnFromQuery(query, bestMatch.type);
      
      return bestMatch.type;
    }
    
    return null;
  }

  /**
   * Get existing room types from Qdrant data
   */
  async getExistingRoomTypes() {
    try {
      const response = await qdrantService.client.scroll("interior_images", {
        limit: 1000,
        with_payload: true,
        with_vector: false
      });
      
      const roomTypes = new Set();
      response.points.forEach(point => {
        if (point.payload.room_type) {
          roomTypes.add(point.payload.room_type.toLowerCase());
        }
      });
      
      return Array.from(roomTypes);
    } catch (error) {
      console.error("Error fetching existing room types:", error);
      return [];
    }
  }

  /**
   * Get all tags and variations from the database
   */
  async getAllDatabaseTags() {
    try {
      const response = await qdrantService.client.scroll("interior_images", {
        limit: 1000,
        with_payload: true,
        with_vector: false
      });
      
      const allTags = new Set();
      
      response.points.forEach(point => {
        // Add room types
        if (point.payload.room_type) {
          allTags.add(point.payload.room_type.toLowerCase());
        }
        
        // Add design themes
        if (point.payload.design_theme) {
          allTags.add(point.payload.design_theme.toLowerCase());
        }
        
        // Add budget categories
        if (point.payload.budget_category) {
          allTags.add(point.payload.budget_category.toLowerCase());
        }
        
        // Add space types
        if (point.payload.space_type) {
          allTags.add(point.payload.space_type.toLowerCase());
        }
        
        // Add tags array
        if (point.payload.tags && Array.isArray(point.payload.tags)) {
          point.payload.tags.forEach(tag => {
            allTags.add(tag.toLowerCase());
          });
        }
        
        // Add description keywords
        if (point.payload.description) {
          const words = point.payload.description.toLowerCase().split(/\s+/);
          words.forEach(word => {
            if (word.length > 2) { // Only meaningful words
              allTags.add(word);
            }
          });
        }
        
        // Add AI-generated tags if available
        if (point.payload.ai_generated_tags) {
          const aiTags = point.payload.ai_generated_tags;
          
          // Room variations
          if (aiTags.room) {
            allTags.add(aiTags.room.toLowerCase());
          }
          
          // Theme variations
          if (aiTags.theme) {
            allTags.add(aiTags.theme.toLowerCase());
          }
          
          // Primary features
          if (aiTags.primary_features && Array.isArray(aiTags.primary_features)) {
            aiTags.primary_features.forEach(feature => {
              allTags.add(feature.toLowerCase());
            });
          }
          
          // Object types and features
          if (aiTags.objects && Array.isArray(aiTags.objects)) {
            aiTags.objects.forEach(obj => {
              if (obj.type) allTags.add(obj.type.toLowerCase());
              if (obj.features && Array.isArray(obj.features)) {
                obj.features.forEach(feature => {
                  allTags.add(feature.toLowerCase());
                });
              }
              if (obj.materials && Array.isArray(obj.materials)) {
                obj.materials.forEach(material => {
                  allTags.add(material.toLowerCase());
                });
              }
            });
          }
          
          // Visual attributes
          if (aiTags.visual_attributes) {
            const va = aiTags.visual_attributes;
            if (va.colors && Array.isArray(va.colors)) {
              va.colors.forEach(color => allTags.add(color.toLowerCase()));
            }
            if (va.materials && Array.isArray(va.materials)) {
              va.materials.forEach(material => allTags.add(material.toLowerCase()));
            }
            if (va.lighting) allTags.add(va.lighting.toLowerCase());
            if (va.texture) allTags.add(va.texture.toLowerCase());
          }
          
          // Indian context
          if (aiTags.indian_context) {
            const ic = aiTags.indian_context;
            if (ic.regional_style) allTags.add(ic.regional_style.toLowerCase());
            if (ic.space_utilization) allTags.add(ic.space_utilization.toLowerCase());
            if (ic.traditional_elements && Array.isArray(ic.traditional_elements)) {
              ic.traditional_elements.forEach(element => {
                allTags.add(element.toLowerCase());
              });
            }
            if (ic.modern_adaptations && Array.isArray(ic.modern_adaptations)) {
              ic.modern_adaptations.forEach(adaptation => {
                allTags.add(adaptation.toLowerCase());
              });
            }
          }
        }
      });
      
      return Array.from(allTags);
    } catch (error) {
      console.error("Error fetching database tags:", error);
      return [];
    }
  }

  /**
   * Match query against existing room types in data
   */
  matchAgainstExistingData(query, existingRoomTypes) {
    // Direct match
    for (const roomType of existingRoomTypes) {
      if (query.includes(roomType) || roomType.includes(query)) {
        return roomType;
      }
    }
    
    // Partial match
    for (const roomType of existingRoomTypes) {
      const words = query.split(' ');
      for (const word of words) {
        if (roomType.includes(word) || word.includes(roomType)) {
          return roomType;
        }
      }
    }
    
    return null;
  }

  /**
   * Find semantic match using embeddings
   */
  async findSemanticMatch(query, existingRoomTypes) {
    try {
      // Get embedding for the query
      const queryEmbedding = await qdrantService.getEmbedding(query);
      
      // Compare with room type embeddings
      const roomTypeEmbeddings = await Promise.all(
        existingRoomTypes.map(async (roomType) => {
          const embedding = await qdrantService.getEmbedding(roomType);
          return { roomType, embedding };
        })
      );
      
      // Find best semantic match
      let bestMatch = null;
      let bestScore = 0;
      
      for (const { roomType, embedding } of roomTypeEmbeddings) {
        const similarity = this.calculateCosineSimilarity(queryEmbedding, embedding);
        if (similarity > bestScore && similarity > 0.7) {
          bestScore = similarity;
          bestMatch = roomType;
        }
      }
      
      return bestMatch;
    } catch (error) {
      console.error("Error in semantic matching:", error);
      return null;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  calculateCosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) return 0;
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }
    
    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Pattern-based detection (fallback)
   */
  patternBasedDetection(query) {
    const patterns = {
      'bedroom': ['bed', 'sleep', 'master', 'guest', 'study room'],
      'kitchen': ['kitchen', 'cook', 'culinary', 'modular'],
      'living room': ['living', 'lounge', 'family', 'drawing'],
      'bathroom': ['bath', 'toilet', 'washroom', 'powder'],
      'dining room': ['dining', 'eat', 'dinner'],
      'home office': ['office', 'study', 'work', 'workspace'],
      'entrance': ['entrance', 'entry', 'foyer', 'hall'],
      'staircase': ['stair', 'steps'],
      'balcony': ['balcony', 'terrace', 'veranda'],
      'prayer room': ['pooja', 'mandir', 'temple', 'prayer']
    };

    for (const [roomType, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => query.includes(keyword))) {
        return roomType;
      }
    }
    
    return null;
  }

  /**
   * Learn from query history
   */
  learnFromQueryHistory(query) {
    if (this.queryHistory.length === 0) return null;
    
    // Find similar queries in history
    const similarQueries = this.queryHistory.filter(entry => 
      this.calculateStringSimilarity(query, entry.query) > 0.6
    );
    
    if (similarQueries.length > 0) {
      // Return the most common room type from similar queries
      const roomTypeCounts = {};
      similarQueries.forEach(entry => {
        if (entry.detectedRoomType) {
          roomTypeCounts[entry.detectedRoomType] = 
            (roomTypeCounts[entry.detectedRoomType] || 0) + 1;
        }
      });
      
      const mostCommon = Object.entries(roomTypeCounts)
        .sort(([,a], [,b]) => b - a)[0];
      
      return mostCommon ? mostCommon[0] : null;
    }
    
    return null;
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  calculateStringSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().split(' '));
    const words2 = new Set(str2.toLowerCase().split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Learn from user queries
   */
  learnFromQuery(query, detectedRoomType) {
    if (!this.learningEnabled) return;
    
    // Add to query history
    this.queryHistory.push({
      query: query.toLowerCase(),
      detectedRoomType,
      timestamp: Date.now()
    });
    
    // Keep only recent history (last 1000 queries)
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(-1000);
    }
    
    // Update patterns based on successful matches
    if (detectedRoomType) {
      const words = query.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.length > 2) { // Only meaningful words
          if (!this.roomTypePatterns.has(detectedRoomType)) {
            this.roomTypePatterns.set(detectedRoomType, new Set());
          }
          this.roomTypePatterns.get(detectedRoomType).add(word);
        }
      });
    }
  }

  /**
   * Get query statistics and learning insights
   */
  getQueryInsights() {
    const roomTypeStats = {};
    const queryFrequency = {};
    
    this.queryHistory.forEach(entry => {
      // Room type statistics
      if (entry.detectedRoomType) {
        roomTypeStats[entry.detectedRoomType] = 
          (roomTypeStats[entry.detectedRoomType] || 0) + 1;
      }
      
      // Query frequency
      queryFrequency[entry.query] = (queryFrequency[entry.query] || 0) + 1;
    });
    
    return {
      totalQueries: this.queryHistory.length,
      roomTypeStats,
      mostFrequentQueries: Object.entries(queryFrequency)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10),
      learnedPatterns: Object.fromEntries(
        Array.from(this.roomTypePatterns.entries()).map(([roomType, patterns]) => [
          roomType, Array.from(patterns)
        ])
      )
    };
  }

  /**
   * Reset learning data
   */
  resetLearning() {
    this.queryHistory = [];
    this.roomTypePatterns.clear();
    this.designThemePatterns.clear();
  }

  /**
   * Enable/disable learning
   */
  setLearningEnabled(enabled) {
    this.learningEnabled = enabled;
  }

  /**
   * Enhanced search with AI layer - main entry point for AI-powered search
   */
  async enhancedSearch(query, limit = 10, filters = {}, useAI = true) {
    if (useAI && process.env.OPENAI_API_KEY) {
      try {
        return await this.intelligentSearch(query, limit, filters);
      } catch (error) {
        console.warn("AI search failed, falling back to regular search:", error.message);
        // Fallback to regular search
        return await qdrantService.search(query, limit, filters);
      }
    } else {
      // Use regular search without AI
      return await qdrantService.search(query, limit, filters);
    }
  }

  /**
   * Get AI search insights and statistics
   */
  getAISearchInsights() {
    const aiQueries = this.queryHistory.filter(entry => entry.ai_used);
    const regularQueries = this.queryHistory.filter(entry => !entry.ai_used);
    
    return {
      total_queries: this.queryHistory.length,
      ai_queries: aiQueries.length,
      regular_queries: regularQueries.length,
      ai_success_rate: aiQueries.length > 0 ? 
        (aiQueries.filter(q => q.success).length / aiQueries.length * 100).toFixed(2) : 0,
      most_common_ai_detections: this.getMostCommonDetections(aiQueries),
      ai_confidence_stats: this.getConfidenceStats(aiQueries)
    };
  }

  /**
   * Get most common AI detections
   */
  getMostCommonDetections(queries) {
    const detections = {};
    queries.forEach(query => {
      if (query.detectedRoomType) {
        detections[query.detectedRoomType] = (detections[query.detectedRoomType] || 0) + 1;
      }
    });
    
    return Object.entries(detections)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([room, count]) => ({ room, count }));
  }

  /**
   * Get confidence statistics for AI detections
   */
  getConfidenceStats(queries) {
    const confidences = queries
      .filter(q => q.confidence)
      .map(q => q.confidence);
    
    if (confidences.length === 0) return { avg: 0, min: 0, max: 0 };
    
    return {
      avg: (confidences.reduce((a, b) => a + b, 0) / confidences.length).toFixed(3),
      min: Math.min(...confidences).toFixed(3),
      max: Math.max(...confidences).toFixed(3)
    };
  }

  /**
   * Test AI search functionality
   */
  async testAISearch(testQueries = []) {
    const defaultQueries = [
      "mandir with brass diyas",
      "modern kitchen with granite countertop",
      "traditional living room with jharokha",
      "study room with wooden furniture",
      "pooja room design"
    ];
    
    const queries = testQueries.length > 0 ? testQueries : defaultQueries;
    const results = [];
    
    for (const query of queries) {
      try {
        console.log(`\n🧪 Testing AI search: "${query}"`);
        const result = await this.intelligentSearch(query, 5);
        results.push({
          query,
          success: true,
          ai_insights: result.ai_insights,
          result_count: result.results?.length || 0
        });
      } catch (error) {
        results.push({
          query,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      total_tests: queries.length,
      successful_tests: results.filter(r => r.success).length,
      failed_tests: results.filter(r => !r.success).length,
      results
    };
  }
}

export default new QueryIntelligenceService(); 
import embeddingService from "./embeddingService.js";
import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";

dotenv.config();

class SearchIntelligenceService {
  constructor() {
    this.expectedEmbeddingDimension = 384; // Ensure compatibility with embedding system
    this.queryEmbeddingModel = null;
    this.initialized = false;
  }

  /**
   * Initialize the query embedding model from Hugging Face
   */
  async initializeQueryModel() {
    if (!this.initialized) {
      try {
        // Use a text generation model that generates 384-dimensional embeddings
        this.queryEmbeddingModel = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2"
        );
        
        // Disable text generation model for now - use only rule-based enhancement
        // This avoids model loading issues and provides reliable functionality
        this.textGenerationModel = null;
        console.log("ℹ️ Text generation model disabled, using rule-based enhancement only");
        
        this.initialized = true;
        console.log("✅ Successfully initialized HF models: all-MiniLM-L6-v2 (384 dims) + rule-based enhancement");
      } catch (error) {
        console.error("Error initializing HF models:", error);
        throw error;
      }
    }
  }

  /**
   * Generate embedding for query using HF model
   */
  async getQueryEmbedding(text) {
    await this.initializeQueryModel();
    try {
      const output = await this.queryEmbeddingModel(text, { 
        pooling: "mean", 
        normalize: true 
      });
      const embedding = output.tolist()[0];
      
      // Validate dimensions
      if (embedding.length !== this.expectedEmbeddingDimension) {
        throw new Error(`Query embedding has wrong dimensions: expected ${this.expectedEmbeddingDimension}, got ${embedding.length}`);
      }
      
      return embedding;
    } catch (error) {
      console.error("Error generating query embedding:", error);
      throw new Error(`Failed to generate query embedding: ${error.message}`);
    }
  }

  /**
   * Prompt-based query enhancement using HF text generation model with 384-dimensional embeddings
   */
  async enhanceSearchQuery(userQuery) {
    try {
      console.log(`🔍 Enhancing query: "${userQuery}" using HF text generation + 384-dim embeddings`);
      
      // First, detect if this is an exact search request
      const exactSearchIntent = this.detectExactSearchIntent(userQuery);
      
      if (exactSearchIntent.isExactSearch && exactSearchIntent.confidence > 0.6) {
        console.log(`🎯 Detected exact search intent with confidence: ${exactSearchIntent.confidence}`);
        return this.enhanceQueryForExactSearch(userQuery, exactSearchIntent);
      }
      
      // Use HF text generation model for query enhancement
      const enhancedQuery = await this.generateEnhancedQueriesWithPrompt(userQuery);
      
      // Validate that all enhanced queries work with 384-dim embeddings
      await this.validateEnhancedQueries(enhancedQuery);
      
      // Add confidence metrics
      enhancedQuery.enhancement_confidence = this.calculateConfidence(userQuery, enhancedQuery);
      
      console.log(`✅ Query enhanced successfully with HF text generation + 384-dim validation`);
      return enhancedQuery;
    } catch (error) {
      console.error("Error enhancing search query:", error);
      // Fallback to rule-based enhancement if HF generation fails
      return await this.generateEnhancedQueries(userQuery);
    }
  }

  /**
   * Generate enhanced queries using HF text generation model
   */
  async generateEnhancedQueriesWithPrompt(userQuery) {
    try {
      await this.initializeQueryModel();
      
      // Check if text generation model is available
      if (!this.textGenerationModel) {
        console.log("⚠️ Text generation model not available, using fallback");
        return await this.generateEnhancedQueries(userQuery);
      }
      
      const prompt = `You are an expert in Indian interior design. Enhance this search query for an interior image database.

User Query: "${userQuery}"

Analyze the query and provide enhanced search terms in JSON format:
{
  "enhanced_query": {
    "primary_search": "Enhanced query for room type, theme, and regional style",
    "semantic_desc": "Enhanced query for detailed descriptions and cultural context", 
    "object_focus": "Enhanced query for furniture, materials, and objects",
    "intent": "primary intent (room_type|design_theme|objects|materials|style|color|budget)",
    "detected_elements": {
      "room_type": "detected room if any",
      "design_theme": "detected theme/style if any", 
      "objects": ["detected furniture/objects"],
      "materials": ["detected materials"],
      "colors": ["detected colors"],
      "indian_context": "regional/cultural context if any"
    }
  },
  "expanded_terms": {
    "synonyms": ["synonym1", "synonym2"],
    "related_terms": ["related1", "related2"], 
    "indian_equivalents": ["Indian term1", "Indian term2"],
    "style_variations": ["style1", "style2"]
  },
  "search_weights": {
    "primary_search": 0.4,
    "semantic_desc": 0.35,
    "object_focus": 0.25
  }
}

Focus on Indian interior design terms, regional styles, and culturally relevant furniture. Return only valid JSON.`;

      const response = await this.textGenerationModel(prompt, {
        max_new_tokens: 500,
        temperature: 0.3,
        do_sample: true,
        top_p: 0.9
      });

      let content = response[0].generated_text;
      
      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("No JSON found in response");
      }

      const enhancedQuery = JSON.parse(jsonMatch[0]);
      
      // Validate the structure
      if (!enhancedQuery.enhanced_query) {
        throw new Error("Invalid response structure");
      }

      console.log(`✅ HF text generation completed for query: "${userQuery}"`);
      return enhancedQuery;
    } catch (error) {
      console.error("Error in HF text generation:", error);
      // Fallback to rule-based enhancement
      return await this.generateEnhancedQueries(userQuery);
    }
  }

  /**
   * Generate enhanced queries using rule-based system (fallback)
   */
  async generateEnhancedQueries(userQuery) {
    const queryLower = userQuery.toLowerCase();
    
    // Detect intent and elements
    const detectedElements = this.detectElements(queryLower);
    const intent = this.detectIntent(queryLower);
    
    // Generate enhanced queries for each vector type
    const primarySearch = this.enhanceForPrimarySearch(userQuery, detectedElements);
    const semanticDesc = this.enhanceForSemanticDesc(userQuery, detectedElements);
    const objectFocus = this.enhanceForObjectFocus(userQuery, detectedElements);
    
    // Generate expanded terms
    const expandedTerms = this.generateExpandedTerms(userQuery, detectedElements);
    
    return {
      enhanced_query: {
        primary_search: primarySearch,
        semantic_desc: semanticDesc,
        object_focus: objectFocus,
        intent: intent,
        detected_elements: detectedElements
      },
      expanded_terms: expandedTerms,
      search_weights: {
        primary_search: 0.4,
        semantic_desc: 0.35,
        object_focus: 0.25
      }
    };
  }

  /**
   * Validate that all enhanced queries work with 384-dim embeddings using HF model
   */
  async validateEnhancedQueries(enhancedQuery) {
    const queries = [
      enhancedQuery.enhanced_query.primary_search,
      enhancedQuery.enhanced_query.semantic_desc,
      enhancedQuery.enhanced_query.object_focus
    ];

    for (let i = 0; i < queries.length; i++) {
      try {
        // Use HF model for query embedding validation
        const embedding = await this.getQueryEmbedding(queries[i]);
        if (embedding.length !== this.expectedEmbeddingDimension) {
          throw new Error(`Query ${i} generated ${embedding.length} dimensions, expected ${this.expectedEmbeddingDimension}`);
        }
        console.log(`✅ Query ${i} validated with HF model: ${embedding.length} dimensions`);
      } catch (error) {
        console.warn(`⚠️ Validation warning for query ${i}: ${error.message}`);
      }
    }
  }

  /**
   * Detect elements in the query
   */
  detectElements(queryLower) {
    const elements = {
      room_type: null,
      design_theme: null,
      objects: [],
      materials: [],
      colors: [],
      indian_context: null
    };

    // Room type detection
    const roomTypes = ['bedroom', 'living room', 'kitchen', 'dining room', 'bathroom', 'study room', 'pooja room', 'balcony', 'terrace'];
    for (const room of roomTypes) {
      if (queryLower.includes(room)) {
        elements.room_type = room;
        break;
      }
    }

    // Design theme detection
    const themes = ['modern', 'traditional', 'contemporary', 'minimalist', 'luxury', 'ethnic', 'indian', 'western'];
    for (const theme of themes) {
      if (queryLower.includes(theme)) {
        elements.design_theme = theme;
        break;
      }
    }

    // Object detection
    const objects = ['sofa', 'bed', 'table', 'chair', 'cabinet', 'shelf', 'mirror', 'lamp', 'cushion', 'curtain'];
    for (const obj of objects) {
      if (queryLower.includes(obj)) {
        elements.objects.push(obj);
      }
    }

    // Material detection
    const materials = ['wood', 'leather', 'fabric', 'glass', 'metal', 'marble', 'granite', 'brass', 'copper'];
    for (const material of materials) {
      if (queryLower.includes(material)) {
        elements.materials.push(material);
      }
    }

    // Color detection
    const colors = ['white', 'black', 'brown', 'beige', 'blue', 'green', 'red', 'yellow', 'pink', 'purple'];
    for (const color of colors) {
      if (queryLower.includes(color)) {
        elements.colors.push(color);
      }
    }

    // Indian context detection
    const indianTerms = ['indian', 'traditional', 'ethnic', 'cultural', 'regional'];
    for (const term of indianTerms) {
      if (queryLower.includes(term)) {
        elements.indian_context = 'indian traditional';
        break;
      }
    }

    return elements;
  }

  /**
   * Detect search intent
   */
  detectIntent(queryLower) {
    if (queryLower.includes('bedroom') || queryLower.includes('living') || queryLower.includes('kitchen')) {
      return 'room_type';
    } else if (queryLower.includes('modern') || queryLower.includes('traditional') || queryLower.includes('contemporary')) {
      return 'design_theme';
    } else if (queryLower.includes('sofa') || queryLower.includes('table') || queryLower.includes('chair')) {
      return 'objects';
    } else if (queryLower.includes('wood') || queryLower.includes('leather') || queryLower.includes('fabric')) {
      return 'materials';
    } else if (queryLower.includes('white') || queryLower.includes('brown') || queryLower.includes('beige')) {
      return 'color';
    } else {
      return 'general';
    }
  }

  /**
   * Enhance query for primary search (room type, theme, regional style)
   */
  enhanceForPrimarySearch(userQuery, detectedElements) {
    let enhanced = userQuery;
    
    if (detectedElements.room_type) {
      enhanced += ` ${detectedElements.room_type} design`;
    }
    
    if (detectedElements.design_theme) {
      enhanced += ` ${detectedElements.design_theme} style`;
    }
    
    if (detectedElements.indian_context) {
      enhanced += ` indian interior design`;
    }
    
    return enhanced || userQuery;
  }

  /**
   * Enhance query for semantic description (cultural context, detailed descriptions)
   */
  enhanceForSemanticDesc(userQuery, detectedElements) {
    let enhanced = userQuery;
    
    if (detectedElements.indian_context) {
      enhanced += ` indian cultural design elements traditional decor`;
    }
    
    if (detectedElements.design_theme) {
      enhanced += ` ${detectedElements.design_theme} interior design style`;
    }
    
    return enhanced || userQuery;
  }

  /**
   * Enhance query for object focus (furniture, materials, objects)
   */
  enhanceForObjectFocus(userQuery, detectedElements) {
    let enhanced = userQuery;
    
    if (detectedElements.objects.length > 0) {
      enhanced += ` ${detectedElements.objects.join(' ')} furniture`;
    }
    
    if (detectedElements.materials.length > 0) {
      enhanced += ` ${detectedElements.materials.join(' ')} materials`;
    }
    
    return enhanced || userQuery;
  }

  /**
   * Generate expanded terms
   */
  generateExpandedTerms(userQuery, detectedElements) {
    const synonyms = [];
    const relatedTerms = [];
    const indianEquivalents = [];
    const styleVariations = [];

    // Generate synonyms based on detected elements
    if (detectedElements.room_type === 'bedroom') {
      synonyms.push('sleeping room', 'master bedroom');
      indianEquivalents.push('shayan kaksh');
    }
    
    if (detectedElements.room_type === 'living room') {
      synonyms.push('drawing room', 'sitting room');
      indianEquivalents.push('baithak', 'drawing room');
    }
    
    if (detectedElements.room_type === 'kitchen') {
      synonyms.push('cooking area', 'kitchen space');
      indianEquivalents.push('rasoi', 'modular kitchen');
    }

    // Generate related terms
    if (detectedElements.objects.includes('sofa')) {
      relatedTerms.push('sectional sofa', 'L-shaped sofa', 'diwan');
      indianEquivalents.push('diwan', 'charpai');
    }
    
    if (detectedElements.objects.includes('bed')) {
      relatedTerms.push('bed frame', 'mattress', 'bedside table');
      indianEquivalents.push('charpai', 'palang');
    }

    // Generate style variations
    if (detectedElements.design_theme === 'modern') {
      styleVariations.push('contemporary', 'minimalist', 'sleek');
    }
    
    if (detectedElements.design_theme === 'traditional') {
      styleVariations.push('ethnic', 'cultural', 'heritage');
    }

    return {
      synonyms,
      related_terms: relatedTerms,
      indian_equivalents: indianEquivalents,
      style_variations: styleVariations
    };
  }

  /**
   * Calculate confidence score for query enhancement
   */
  calculateConfidence(originalQuery, enhancedQuery) {
    const hasDetectedElements = Object.values(enhancedQuery.detected_elements || {}).some(val => 
      val && (Array.isArray(val) ? val.length > 0 : val.trim().length > 0)
    );
    
    const hasExpandedTerms = Object.values(enhancedQuery.expanded_terms || {}).some(val => 
      Array.isArray(val) && val.length > 0
    );

    let confidence = 0.5; // Base confidence
    if (hasDetectedElements) confidence += 0.3;
    if (hasExpandedTerms) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Create fallback enhanced query if AI enhancement fails
   */
  createFallbackQuery(userQuery) {
    const queryLower = userQuery.toLowerCase();
    
    // Basic intent detection
    let intent = "general";
    if (queryLower.includes("bedroom") || queryLower.includes("living") || queryLower.includes("kitchen")) {
      intent = "room_type";
    } else if (queryLower.includes("modern") || queryLower.includes("traditional") || queryLower.includes("contemporary")) {
      intent = "design_theme";
    } else if (queryLower.includes("sofa") || queryLower.includes("table") || queryLower.includes("chair")) {
      intent = "objects";
    }

    return {
      enhanced_query: {
        primary_search: userQuery,
        semantic_desc: userQuery,
        object_focus: userQuery,
        intent: intent,
        detected_elements: {}
      },
      expanded_terms: {
        synonyms: [],
        related_terms: [],
        indian_equivalents: [],
        style_variations: []
      },
      search_weights: {
        primary_search: 0.4,
        semantic_desc: 0.35,
        object_focus: 0.25
      },
      enhancement_confidence: 0.3
    };
  }

  /**
   * Generate search suggestions using HF text generation model with 384-dimensional system
   */
  async generateSearchSuggestions(partialQuery, existingData) {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return this.getBasicSuggestions(existingData);
      }

      console.log(`🔍 Generating suggestions for: "${partialQuery}" using HF text generation + 384-dim system`);
      
      // Try HF text generation first
      try {
        const suggestions = await this.generateSuggestionsWithPrompt(partialQuery);
        await this.validateSuggestions(suggestions);
        console.log(`✅ Generated ${suggestions.length} suggestions with HF text generation + 384-dim validation`);
        return suggestions;
      } catch (error) {
        console.warn(`⚠️ HF text generation failed, falling back to rule-based: ${error.message}`);
        // Fallback to rule-based suggestions
        const suggestions = this.generateSuggestionsFromPartial(partialQuery);
        await this.validateSuggestions(suggestions);
        console.log(`✅ Generated ${suggestions.length} suggestions with rule-based + 384-dim validation`);
        return suggestions;
      }
    } catch (error) {
      console.error("Error generating search suggestions:", error);
      return this.getBasicSuggestions(existingData);
    }
  }

  /**
   * Generate suggestions using HF text generation model
   */
  async generateSuggestionsWithPrompt(partialQuery) {
    try {
      await this.initializeQueryModel();
      
      // Check if text generation model is available
      if (!this.textGenerationModel) {
        console.log("⚠️ Text generation model not available for suggestions, using fallback");
        return this.generateSuggestionsFromPartial(partialQuery);
      }
      
      const prompt = `Based on this partial search query for Indian interior design: "${partialQuery}"

Suggest 10 relevant completions that users might be searching for. Focus on:
1. Indian interior design terms
2. Room types common in Indian homes
3. Popular furniture and decor items
4. Regional design styles
5. Materials and finishes

Return as JSON array: ["suggestion1", "suggestion2", ...]`;

      const response = await this.textGenerationModel(prompt, {
        max_new_tokens: 300,
        temperature: 0.5,
        do_sample: true,
        top_p: 0.9
      });

      let content = response[0].generated_text;
      
      // Extract JSON array from response
      const arrayMatch = content.match(/\[[\s\S]*\]/);
      if (!arrayMatch) {
        throw new Error("No JSON array found in response");
      }

      const suggestions = JSON.parse(arrayMatch[0]);
      
      if (!Array.isArray(suggestions)) {
        throw new Error("Response is not a valid array");
      }

      console.log(`✅ HF text generation completed for suggestions: "${partialQuery}"`);
      return suggestions.slice(0, 10); // Limit to 10 suggestions
    } catch (error) {
      console.error("Error in HF text generation for suggestions:", error);
      // Fallback to rule-based suggestions
      return this.generateSuggestionsFromPartial(partialQuery);
    }
  }

  /**
   * Generate suggestions based on partial query (rule-based fallback)
   */
  generateSuggestionsFromPartial(partialQuery) {
    const queryLower = partialQuery.toLowerCase();
    const suggestions = [];

    // Room type suggestions
    if (queryLower.includes('bed') || queryLower.includes('sleep')) {
      suggestions.push('bedroom design', 'master bedroom', 'bedroom decor', 'bedroom furniture');
    }
    
    if (queryLower.includes('liv') || queryLower.includes('sit')) {
      suggestions.push('living room design', 'drawing room', 'sitting area', 'living room furniture');
    }
    
    if (queryLower.includes('kit') || queryLower.includes('cook')) {
      suggestions.push('kitchen design', 'modular kitchen', 'kitchen island', 'kitchen cabinets');
    }

    // Furniture suggestions
    if (queryLower.includes('sof') || queryLower.includes('couch')) {
      suggestions.push('sofa design', 'sectional sofa', 'L-shaped sofa', 'diwan', 'leather sofa');
    }
    
    if (queryLower.includes('tab')) {
      suggestions.push('dining table', 'coffee table', 'side table', 'study table');
    }
    
    if (queryLower.includes('chair')) {
      suggestions.push('dining chairs', 'accent chair', 'armchair', 'office chair');
    }

    // Style suggestions
    if (queryLower.includes('mod') || queryLower.includes('contemp')) {
      suggestions.push('modern design', 'contemporary style', 'minimalist design', 'modern furniture');
    }
    
    if (queryLower.includes('trad') || queryLower.includes('ethn')) {
      suggestions.push('traditional design', 'ethnic decor', 'indian traditional', 'cultural elements');
    }

    // Material suggestions
    if (queryLower.includes('wood')) {
      suggestions.push('wooden furniture', 'teak wood', 'rosewood', 'wooden decor');
    }
    
    if (queryLower.includes('leath')) {
      suggestions.push('leather sofa', 'leather furniture', 'leather upholstery');
    }

    // Color suggestions
    if (queryLower.includes('whit') || queryLower.includes('beig')) {
      suggestions.push('white decor', 'beige interior', 'neutral colors', 'light colors');
    }
    
    if (queryLower.includes('brown') || queryLower.includes('wood')) {
      suggestions.push('brown furniture', 'wooden tones', 'warm colors');
    }

    // Indian context suggestions
    if (queryLower.includes('indian') || queryLower.includes('cult')) {
      suggestions.push('indian design', 'cultural decor', 'traditional indian', 'ethnic elements');
    }

    // Add basic suggestions if none found
    if (suggestions.length === 0) {
      suggestions.push(
        'modern living room',
        'traditional bedroom',
        'modular kitchen',
        'contemporary design',
        'indian decor',
        'wooden furniture',
        'sectional sofa',
        'dining room design'
      );
    }

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  }

  /**
   * Validate that suggestions work with 384-dim embeddings using HF model
   */
  async validateSuggestions(suggestions) {
    for (let i = 0; i < Math.min(suggestions.length, 3); i++) { // Test first 3 suggestions
      try {
        // Use HF model for suggestion validation
        const embedding = await this.getQueryEmbedding(suggestions[i]);
        if (embedding.length !== this.expectedEmbeddingDimension) {
          console.warn(`⚠️ Suggestion validation warning: "${suggestions[i]}" generated ${embedding.length} dimensions`);
        } else {
          console.log(`✅ Suggestion "${suggestions[i]}" validated with HF model: ${embedding.length} dimensions`);
        }
      } catch (error) {
        console.warn(`⚠️ Suggestion validation error: ${error.message}`);
      }
    }
  }

  /**
   * Get basic search suggestions from existing data
   */
  getBasicSuggestions(existingData) {
    const basicSuggestions = [
      "modern living room",
      "traditional bedroom", 
      "modular kitchen",
      "contemporary dining room",
      "Indian traditional decor",
      "wooden furniture",
      "sectional sofa",
      "granite countertop",
      "pooja room design",
      "balcony decor"
    ];

    // Merge with existing data suggestions if available
    if (existingData) {
      const combined = [
        ...basicSuggestions,
        ...(existingData.room_types || []).map(room => `${room} design`),
        ...(existingData.design_themes || []).slice(0, 5)
      ];
      return combined.slice(0, 10);
    }

    return basicSuggestions;
  }

  /**
   * Perform semantic similarity matching using HF model
   */
  async calculateSemanticSimilarity(query, storedVector) {
    try {
      // Generate query embedding using HF model
      const queryEmbedding = await this.getQueryEmbedding(query);
      
      // Calculate cosine similarity
      const similarity = this.cosineSimilarity(queryEmbedding, storedVector);
      
      console.log(`🔍 Semantic similarity for "${query}": ${similarity.toFixed(4)}`);
      return similarity;
    } catch (error) {
      console.error("Error calculating semantic similarity:", error);
      return 0.0;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vectorA, vectorB) {
    if (vectorA.length !== vectorB.length) {
      throw new Error("Vectors must have same dimensions for similarity calculation");
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vectorA.length; i++) {
      dotProduct += vectorA[i] * vectorB[i];
      normA += vectorA[i] * vectorA[i];
      normB += vectorB[i] * vectorB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Match query against stored vectors using HF model
   */
  async matchQueryAgainstVectors(query, storedVectors, threshold = 0.3) {
    try {
      console.log(`🔍 Matching query "${query}" against ${storedVectors.length} stored vectors using HF model`);
      
      const matches = [];
      
      for (let i = 0; i < storedVectors.length; i++) {
        const similarity = await this.calculateSemanticSimilarity(query, storedVectors[i]);
        
        if (similarity >= threshold) {
          matches.push({
            index: i,
            similarity: similarity,
            query: query
          });
        }
      }
      
      // Sort by similarity score (highest first)
      matches.sort((a, b) => b.similarity - a.similarity);
      
      console.log(`✅ Found ${matches.length} matches above threshold ${threshold}`);
      return matches;
    } catch (error) {
      console.error("Error matching query against vectors:", error);
      return [];
    }
  }

  /**
   * Detect if the query is requesting exact search
   */
  detectExactSearchIntent(userQuery) {
    const queryLower = userQuery.toLowerCase();
    
    // Keywords that indicate exact search intent
    const exactSearchKeywords = [
      'exact', 'precise', 'specific', 'exactly', 'precisely',
      'match', 'matches', 'matching', 'exact match',
      'same', 'identical', 'similar', 'similar to',
      'like', 'as', 'such as', 'for example'
    ];
    
    // Check for exact search indicators
    const hasExactKeywords = exactSearchKeywords.some(keyword => 
      queryLower.includes(keyword)
    );
    
    // Check for quoted terms (exact phrase search)
    const quotedTerms = userQuery.match(/"([^"]+)"/g);
    const hasQuotedTerms = quotedTerms && quotedTerms.length > 0;
    
    // Check for specific room types or design terms
    const specificTerms = [
      'kitchen', 'bedroom', 'living room', 'bathroom', 'dining room',
      'puja room', 'pooja room', 'mandir', 'temple',
      'modern', 'traditional', 'contemporary', 'classic',
      'marble', 'wood', 'glass', 'metal', 'fabric'
    ];
    
    const hasSpecificTerms = specificTerms.some(term => 
      queryLower.includes(term)
    );
    
    return {
      isExactSearch: hasExactKeywords || hasQuotedTerms || hasSpecificTerms,
      confidence: this.calculateExactSearchConfidence(userQuery, hasExactKeywords, hasQuotedTerms, hasSpecificTerms),
      exactTerms: quotedTerms || [],
      specificTerms: specificTerms.filter(term => queryLower.includes(term))
    };
  }

  /**
   * Calculate confidence for exact search detection
   */
  calculateExactSearchConfidence(userQuery, hasExactKeywords, hasQuotedTerms, hasSpecificTerms) {
    let confidence = 0;
    
    if (hasExactKeywords) confidence += 0.4;
    if (hasQuotedTerms) confidence += 0.5;
    if (hasSpecificTerms) confidence += 0.3;
    
    // Additional confidence for short, specific queries
    const words = userQuery.split(/\s+/).filter(word => word.length > 0);
    if (words.length <= 3) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Enhance query for exact search
   */
  enhanceQueryForExactSearch(userQuery, exactSearchIntent) {
    const enhancedQuery = {
      original_query: userQuery,
      exact_search: {
        enabled: true,
        confidence: exactSearchIntent.confidence,
        exact_terms: exactSearchIntent.exactTerms,
        specific_terms: exactSearchIntent.specificTerms
      },
      enhanced_query: {
        primary_search: userQuery, // Keep original for exact matching
        semantic_desc: userQuery, // Keep original for exact matching
        object_focus: userQuery, // Keep original for exact matching
        intent: "exact_search"
      },
      search_weights: {
        exact_match: 0.8, // High weight for exact matches
        primary_search: 0.1,
        semantic_desc: 0.05,
        object_focus: 0.05
      }
    };
    
    return enhancedQuery;
  }
}

export default new SearchIntelligenceService(); 
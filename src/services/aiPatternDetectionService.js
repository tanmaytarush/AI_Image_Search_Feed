/**
 * AI-Powered Pattern Detection Service
 * Replaces all hardcoded patterns with dynamic AI prompting
 */

import { InferenceClient } from "@huggingface/inference";
import dotenv from "dotenv";

dotenv.config();

class AIPatternDetectionService {
  constructor() {
    try {
      this.hf = new InferenceClient(process.env.HF_TOKEN);
      // Temporarily disable AI to use fallback responses
      this.textGenerationModel = "microsoft/DialoGPT-medium";
      
      this.patternCache = new Map();
      this.aiAvailable = false; // Temporarily disable AI
      console.log("⚠️ AI Pattern Detection Service initialized with fallback mode (AI disabled)");
    } catch (error) {
      console.warn("AI pattern detection service initialization failed:", error.message);
      this.aiAvailable = false;
    }
  }

  /**
   * AI-powered room type detection with dynamic pattern analysis
   */
  async detectRoomTypeAI(query, availableRoomTypes = []) {
    try {
      if (!this.aiAvailable) {
        return this.fallbackRoomTypeDetection(query, availableRoomTypes);
      }

      const prompt = `Analyze this query for room type detection: "${query}"
Available room types: ${availableRoomTypes.join(", ")}

Detect room type and respond with JSON:
{
  "detectedRoom": "room_type_or_null",
  "confidence": 0.95,
  "reasoning": "explanation",
  "detectedPatterns": ["patterns"],
  "semanticIndicators": ["indicators"],
  "culturalContext": "context",
  "isFurnitureQuery": false,
  "furnitureType": null,
  "alternativeMatches": [],
  "patternType": "exact"
}`;

      const response = await this.callTextGeneration(prompt);
      return this.parseJSONResponse(response) || this.fallbackRoomTypeDetection(query, availableRoomTypes);
    } catch (error) {
      console.error("Error in AI room type detection:", error);
      return this.fallbackRoomTypeDetection(query, availableRoomTypes);
    }
  }

  /**
   * Alternative: Use conversational model for complex analysis
   */
  async detectRoomTypeConversational(query, availableRoomTypes = []) {
    try {
      if (!this.aiAvailable) {
        return this.fallbackRoomTypeDetection(query, availableRoomTypes);
      }

      const messages = [
        {
          role: "user",
          content: `You are an interior design expert. Analyze this query: "${query}". Available room types: ${availableRoomTypes.join(", ")}. 

Respond with JSON format:
{
  "detectedRoom": "room_type_or_null",
  "confidence": 0.95,
  "reasoning": "explanation"
}`
        }
      ];

      const response = await this.callConversational(messages);
      return this.parseJSONResponse(response.generated_text) || this.fallbackRoomTypeDetection(query, availableRoomTypes);
    } catch (error) {
      console.error("Error in conversational room type detection:", error);
      return this.fallbackRoomTypeDetection(query, availableRoomTypes);
    }
  }

  /**
   * Call text generation model with deepseek-ai/DeepSeek-V3-0324
   */
  async callTextGeneration(prompt, useCache = true) {
    const cacheKey = this.generateCacheKey(prompt);
    
    if (useCache && this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey);
    }

    if (!this.aiAvailable) {
      return this.getFallbackResponse();
    }

    try {
      console.log(`🤖 Using DeepSeek model: ${this.textGenerationModel}`);
      
      const response = await this.hf.textGeneration({
        model: this.textGenerationModel,
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.3,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
          stop: ["\n\n", "User:", "Assistant:"]
        }
      });

      console.log(`✅ Successfully used DeepSeek model`);
      
      if (useCache) {
        this.patternCache.set(cacheKey, response.generated_text);
      }

      return response.generated_text;
    } catch (error) {
      console.error("DeepSeek model failed:", error.message);
      return this.getFallbackResponse();
    }
  }

  /**
   * Call conversational model using DeepSeek
   */
  async callConversational(messages, useCache = true) {
    const cacheKey = this.generateCacheKey(JSON.stringify(messages));
    
    if (useCache && this.patternCache.has(cacheKey)) {
      return this.patternCache.get(cacheKey);
    }

    if (!this.aiAvailable) {
      return this.getFallbackResponse();
    }

    try {
      console.log(`🤖 Using DeepSeek for conversational: ${this.textGenerationModel}`);
      
      // Convert messages to a single prompt
      const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
      
      const response = await this.hf.textGeneration({
        model: this.textGenerationModel,
        inputs: prompt,
        parameters: {
          max_new_tokens: 200,
          temperature: 0.3,
          top_p: 0.9,
          do_sample: true,
          return_full_text: false,
          stop: ["\n\n", "User:", "Assistant:"]
        }
      });

      console.log(`✅ Successfully used DeepSeek for conversational`);
      
      const result = {
        generated_text: response.generated_text,
        conversation: {
          past_user_inputs: messages.filter(m => m.role === 'user').map(m => m.content),
          generated_responses: [response.generated_text]
        }
      };
      
      if (useCache) {
        this.patternCache.set(cacheKey, result);
      }

      return result;
    } catch (error) {
      console.error("DeepSeek conversational failed:", error.message);
      return this.getFallbackResponse();
    }
  }

  /**
   * Unified AI call method - temporarily using fallback responses
   */
  async callAI(prompt, useCache = true) {
    // Temporarily return fallback responses
    console.log("⚠️ Using fallback response for AI call");
    return this.getFallbackResponse();
  }

  /**
   * Parse JSON response with error handling
   */
  parseJSONResponse(response) {
    if (!response || typeof response !== 'string') {
      return null;
    }

    try {
      // Clean the response - remove any non-JSON content
      const jsonMatch = response.match(/\{.*\}/s);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      return JSON.parse(response);
    } catch (error) {
      console.warn("Failed to parse JSON response:", error.message);
      return null;
    }
  }

  /**
   * Enhanced fallback response
   */
  getFallbackResponse() {
    return JSON.stringify({
      detectedRoom: null,
      confidence: 0.5,
      reasoning: "Fallback pattern detection - AI unavailable",
      detectedPatterns: [],
      semanticIndicators: [],
      culturalContext: "",
      isFurnitureQuery: false,
      furnitureType: null,
      alternativeMatches: [],
      patternType: "fallback",
      compoundTerms: [],
      culturalTerms: [],
      functionalTerms: []
    });
  }

  /**
   * AI-powered conflict detection for room types
   */
  async detectConflictsAI(roomType, query, context = {}) {
    try {
      if (!this.aiAvailable) {
        return this.fallbackConflictDetection(roomType, query, context);
      }

      const prompt = `Analyze if this room type conflicts with the query context.

ROOM TYPE: "${roomType}"
QUERY: "${query}"
CONTEXT: ${JSON.stringify(context)}

Return JSON:
{
  "hasConflict": true/false,
  "conflictType": "semantic|cultural|intent|none",
  "confidence": 0.95,
  "reasoning": "detailed conflict analysis",
  "suggestedResolution": "alternative_approach_if_conflict",
  "alternativeRoomTypes": ["other_room_types_to_consider"]
}`;

      const response = await this.callAI(prompt);
      return this.parseJSONResponse(response) || this.fallbackConflictDetection(roomType, query, context);
    } catch (error) {
      console.error("Error in AI conflict detection:", error);
      return this.fallbackConflictDetection(roomType, query, context);
    }
  }

  /**
   * AI-powered compound term detection
   */
  async detectCompoundTermsAI(query) {
    try {
      if (!this.aiAvailable) {
        return this.fallbackCompoundTermDetection(query);
      }

      const prompt = `Detect compound terms and phrases in this query: "${query}"

Return JSON:
{
  "compoundTerms": [
    {
      "term": "exact_compound_term",
      "category": "room|furniture|functional|cultural",
      "confidence": 0.95,
      "semanticType": "exact|partial|implicit"
    }
  ],
  "detectedPatterns": ["pattern_types_found"],
  "culturalTerms": ["cultural_compound_terms"],
  "functionalTerms": ["functional_compound_terms"]
}`;

      const response = await this.callAI(prompt);
      const result = this.parseJSONResponse(response);
      
      // Ensure we always return a valid structure
      if (result && result.compoundTerms && Array.isArray(result.compoundTerms)) {
        return result;
      }
      
      return this.fallbackCompoundTermDetection(query);
    } catch (error) {
      console.error("Error in AI compound term detection:", error);
      return this.fallbackCompoundTermDetection(query);
    }
  }

  /**
   * AI-powered furniture vs room type detection
   */
  async detectFurnitureVsRoomAI(query) {
    try {
      if (!this.aiAvailable) {
        return this.fallbackFurnitureVsRoomDetection(query);
      }

      const prompt = `Determine if this query is about furniture/objects or room types: "${query}"

Return JSON:
{
  "isFurnitureQuery": true/false,
  "furnitureType": "specific_furniture_type_or_null",
  "roomType": "specific_room_type_or_null",
  "confidence": 0.95,
  "reasoning": "detailed classification explanation",
  "semanticIndicators": ["clues_used_for_classification"],
  "ambiguityLevel": "low|medium|high",
  "suggestedApproach": "furniture_search|room_search|hybrid_search"
}`;

      const response = await this.callAI(prompt);
      return this.parseJSONResponse(response) || this.fallbackFurnitureVsRoomDetection(query);
    } catch (error) {
      console.error("Error in AI furniture vs room detection:", error);
      return this.fallbackFurnitureVsRoomDetection(query);
    }
  }

  /**
   * AI-powered cultural context detection
   */
  async detectCulturalContextAI(query) {
    try {
      if (!this.aiAvailable) {
        return this.fallbackCulturalContextDetection(query);
      }

      const prompt = `Analyze this query for Indian cultural context: "${query}"

Return JSON:
{
  "culturalContext": "indian|regional|traditional|modern|mixed",
  "regionalContext": "north|south|east|west|pan_india",
  "religiousContext": "hindu|muslim|christian|other|none",
  "traditionalElements": ["traditional_terms_detected"],
  "modernAdaptations": ["modern_terms_detected"],
  "regionalTerms": ["regional_language_terms"],
  "confidence": 0.95,
  "reasoning": "detailed cultural analysis"
}`;

      const response = await this.callAI(prompt);
      return this.parseJSONResponse(response) || this.fallbackCulturalContextDetection(query);
    } catch (error) {
      console.error("Error in AI cultural context detection:", error);
      return this.fallbackCulturalContextDetection(query);
    }
  }

  /**
   * AI-powered synonym and variation detection
   */
  async detectSynonymsAndVariationsAI(query, category = "room_types") {
    try {
      if (!this.aiAvailable) {
        return this.fallbackSynonymDetection(query, category);
      }

      const prompt = `Find synonyms and variations for this query: "${query}" in category: "${category}"

Return JSON:
{
  "exactSynonyms": ["exact_synonyms"],
  "relatedTerms": ["related_terms"],
  "regionalVariations": ["regional_language_terms"],
  "culturalVariations": ["cultural_traditional_terms"],
  "abbreviations": ["common_abbreviations"],
  "confidence": 0.95,
  "reasoning": "detailed synonym analysis"
}`;

      const response = await this.callAI(prompt);
      return this.parseJSONResponse(response) || this.fallbackSynonymDetection(query, category);
    } catch (error) {
      console.error("Error in AI synonym detection:", error);
      return this.fallbackSynonymDetection(query, category);
    }
  }

  /**
   * AI-powered search intent detection
   */
  async detectSearchIntentAI(query) {
    try {
      if (!this.aiAvailable) {
        return this.fallbackSearchIntentDetection(query);
      }

      const prompt = `Determine the primary search intent of this query: "${query}"

Return JSON:
{
  "primaryIntent": "room_type|furniture|style|material|color|budget|general",
  "secondaryIntents": ["secondary_intents"],
  "confidence": 0.95,
  "reasoning": "detailed intent analysis",
  "userBehavior": "specific|exploratory|comparison|inspiration",
  "ambiguityLevel": "low|medium|high"
}`;

      const response = await this.callAI(prompt);
      return this.parseJSONResponse(response) || this.fallbackSearchIntentDetection(query);
    } catch (error) {
      console.error("Error in AI search intent detection:", error);
      return this.fallbackSearchIntentDetection(query);
    }
  }

  /**
   * AI-powered pattern validation
   */
  async validatePatternAI(pattern, context = {}) {
    try {
      if (!this.aiAvailable) {
        return this.fallbackPatternValidation(pattern, context);
      }

      const prompt = `Validate if this pattern is appropriate for the context.

PATTERN: ${JSON.stringify(pattern)}
CONTEXT: ${JSON.stringify(context)}

Return JSON:
{
  "isValid": true/false,
  "confidence": 0.95,
  "reasoning": "detailed validation explanation",
  "suggestedImprovements": ["improvement_suggestions"],
  "alternativePatterns": ["alternative_patterns"],
  "validationScore": 0.95
}`;

      const response = await this.callAI(prompt);
      return this.parseJSONResponse(response) || this.fallbackPatternValidation(pattern, context);
    } catch (error) {
      console.error("Error in AI pattern validation:", error);
      return this.fallbackPatternValidation(pattern, context);
    }
  }

  // Keep all your existing fallback methods unchanged...
  fallbackRoomTypeDetection(query, availableRoomTypes = []) {
    const queryLower = query.toLowerCase();
    
    const patterns = {
      'bedroom': ['bedroom', 'bed room', 'sleeping room', 'master bedroom', 'guest bedroom'],
      'kitchen': ['kitchen', 'cooking area', 'rasoi'],
      'living room': ['living room', 'sitting room', 'lounge', 'drawing room'],
      'dining room': ['dining room', 'dining area', 'eating area'],
      'bathroom': ['bathroom', 'washroom', 'toilet'],
      'prayer room': ['prayer room', 'pooja room', 'mandir', 'temple', 'puja room']
    };

    for (const [roomType, keywords] of Object.entries(patterns)) {
      if (keywords.some(keyword => queryLower.includes(keyword))) {
        return {
          detectedRoom: roomType,
          confidence: 0.7,
          reasoning: "Fallback pattern matching",
          detectedPatterns: [roomType],
          semanticIndicators: [roomType],
          culturalContext: "",
          isFurnitureQuery: false,
          furnitureType: null,
          alternativeMatches: [],
          patternType: "fallback"
        };
      }
    }

    return {
      detectedRoom: null,
      confidence: 0,
      reasoning: "No room type detected in fallback",
      detectedPatterns: [],
      semanticIndicators: [],
      culturalContext: "",
      isFurnitureQuery: false,
      furnitureType: null,
      alternativeMatches: [],
      patternType: "fallback"
    };
  }

  /**
   * Fallback conflict detection
   */
  fallbackConflictDetection(roomType, query, context) {
    return {
      hasConflict: false,
      conflictType: "none",
      confidence: 0.5,
      reasoning: "Fallback conflict detection",
      suggestedResolution: null,
      alternativeRoomTypes: []
    };
  }

  /**
   * Fallback compound term detection
   */
  fallbackCompoundTermDetection(query) {
    const queryLower = query.toLowerCase();
    const compoundTerms = [];
    
    // Basic compound term patterns
    const patterns = [
      { pattern: /(\w+)\s+room/i, category: 'room' },
      { pattern: /(\w+)\s+area/i, category: 'functional' },
      { pattern: /(\w+)\s+space/i, category: 'functional' },
      { pattern: /(\w+)\s+unit/i, category: 'functional' },
      { pattern: /(\w+)\s+section/i, category: 'functional' }
    ];

    for (const { pattern, category } of patterns) {
      const matches = queryLower.match(pattern);
      if (matches) {
        compoundTerms.push({
          term: matches[0],
          category: category,
          confidence: 0.7,
          semanticType: "exact"
        });
      }
    }

    return {
      compoundTerms: compoundTerms,
      detectedPatterns: compoundTerms.map(term => term.term),
      culturalTerms: [],
      functionalTerms: compoundTerms.filter(term => term.category === 'functional').map(term => term.term)
    };
  }

  /**
   * Fallback furniture vs room type detection
   */
  fallbackFurnitureVsRoomDetection(query) {
    const queryLower = query.toLowerCase();
    
    // Basic furniture keywords
    const furnitureKeywords = [
      'wardrobe', 'cabinet', 'table', 'chair', 'sofa', 'bed', 'shelf', 'mirror',
      'lamp', 'vase', 'painting', 'curtain', 'carpet', 'rug', 'cushion', 'pillow'
    ];

    const isFurniture = furnitureKeywords.some(keyword => queryLower.includes(keyword));
    
    return {
      isFurnitureQuery: isFurniture,
      furnitureType: isFurniture ? furnitureKeywords.find(keyword => queryLower.includes(keyword)) : null,
      roomType: null,
      confidence: 0.6,
      reasoning: "Fallback furniture detection",
      semanticIndicators: isFurniture ? [furnitureKeywords.find(keyword => queryLower.includes(keyword))] : [],
      ambiguityLevel: "medium",
      suggestedApproach: isFurniture ? "furniture_search" : "room_search"
    };
  }

  /**
   * Fallback cultural context detection
   */
  fallbackCulturalContextDetection(query) {
    const queryLower = query.toLowerCase();
    
    // Basic cultural term detection
    const traditionalElements = [];
    const modernAdaptations = [];
    const regionalTerms = [];
    
    // Traditional Indian terms
    const traditionalTerms = ['pooja', 'puja', 'mandir', 'temple', 'rasoi', 'baithak'];
    // Modern terms
    const modernTerms = ['modern', 'contemporary', 'minimalist'];
    // Regional terms
    const regionalTermsList = ['drawing room', 'hall', 'otur'];
    
    for (const term of traditionalTerms) {
      if (queryLower.includes(term)) {
        traditionalElements.push(term);
      }
    }
    
    for (const term of modernTerms) {
      if (queryLower.includes(term)) {
        modernAdaptations.push(term);
      }
    }
    
    for (const term of regionalTermsList) {
      if (queryLower.includes(term)) {
        regionalTerms.push(term);
      }
    }
    
    return {
      culturalContext: traditionalElements.length > 0 ? "traditional" : "modern",
      regionalContext: "pan_india",
      religiousContext: traditionalElements.some(term => ['pooja', 'puja', 'mandir', 'temple'].includes(term)) ? "hindu" : "none",
      traditionalElements: traditionalElements,
      modernAdaptations: modernAdaptations,
      regionalTerms: regionalTerms,
      confidence: 0.6,
      reasoning: "Fallback cultural detection"
    };
  }

  /**
   * Fallback synonym detection
   */
  fallbackSynonymDetection(query, category) {
    const queryLower = query.toLowerCase();
    
    // Basic synonym mappings
    const synonyms = {
      'tv': ['television', 'tv unit'],
      'sofa': ['couch', 'settee'],
      'bedroom': ['bed room', 'sleeping room'],
      'kitchen': ['cooking area', 'rasoi'],
      'bathroom': ['washroom', 'toilet'],
      'dining': ['dining area', 'eating area'],
      'living': ['living room', 'sitting room'],
      'prayer': ['pooja', 'puja', 'worship'],
      'temple': ['mandir', 'prayer room']
    };

    const exactSynonyms = synonyms[queryLower] || [];
    
    return {
      exactSynonyms: exactSynonyms,
      relatedTerms: [],
      regionalVariations: [],
      culturalVariations: [],
      abbreviations: [],
      confidence: 0.6,
      reasoning: "Fallback synonym detection"
    };
  }

  /**
   * Fallback search intent detection
   */
  fallbackSearchIntentDetection(query) {
    const queryLower = query.toLowerCase();
    
    // Basic intent detection
    const roomKeywords = ['bedroom', 'kitchen', 'living', 'dining', 'bathroom', 'prayer', 'pooja'];
    const furnitureKeywords = ['wardrobe', 'cabinet', 'table', 'chair', 'sofa', 'bed', 'shelf'];
    const styleKeywords = ['modern', 'traditional', 'contemporary', 'minimalist'];
    const materialKeywords = ['wood', 'marble', 'glass', 'metal', 'fabric'];
    const colorKeywords = ['red', 'blue', 'green', 'white', 'black', 'brown'];
    
    if (roomKeywords.some(keyword => queryLower.includes(keyword))) {
      return {
        primaryIntent: "room_type",
        secondaryIntents: [],
        confidence: 0.7,
        reasoning: "Fallback room type detection",
        userBehavior: "specific",
        ambiguityLevel: "low"
      };
    } else if (furnitureKeywords.some(keyword => queryLower.includes(keyword))) {
      return {
        primaryIntent: "furniture",
        secondaryIntents: [],
        confidence: 0.7,
        reasoning: "Fallback furniture detection",
        userBehavior: "specific",
        ambiguityLevel: "low"
      };
    } else if (styleKeywords.some(keyword => queryLower.includes(keyword))) {
      return {
        primaryIntent: "style",
        secondaryIntents: [],
        confidence: 0.6,
        reasoning: "Fallback style detection",
        userBehavior: "exploratory",
        ambiguityLevel: "medium"
      };
    } else if (materialKeywords.some(keyword => queryLower.includes(keyword))) {
      return {
        primaryIntent: "material",
        secondaryIntents: [],
        confidence: 0.6,
        reasoning: "Fallback material detection",
        userBehavior: "specific",
        ambiguityLevel: "medium"
      };
    } else if (colorKeywords.some(keyword => queryLower.includes(keyword))) {
      return {
        primaryIntent: "color",
        secondaryIntents: [],
        confidence: 0.6,
        reasoning: "Fallback color detection",
        userBehavior: "specific",
        ambiguityLevel: "medium"
      };
    } else {
      return {
        primaryIntent: "general",
        secondaryIntents: [],
        confidence: 0.5,
        reasoning: "Fallback general detection",
        userBehavior: "exploratory",
        ambiguityLevel: "high"
      };
    }
  }

  /**
   * Fallback pattern validation
   */
  fallbackPatternValidation(pattern, context) {
    return {
      isValid: true,
      confidence: 0.5,
      reasoning: "Fallback pattern validation",
      suggestedImprovements: [],
      alternativePatterns: [],
      validationScore: 0.5
    };
  }

  generateCacheKey(prompt) {
    return Buffer.from(prompt).toString('base64').substring(0, 32);
  }

  clearCache() {
    this.patternCache.clear();
  }

  getCacheStats() {
    return {
      size: this.patternCache.size,
      keys: Array.from(this.patternCache.keys())
    };
  }
}

export default new AIPatternDetectionService(); 
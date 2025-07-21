import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

class SearchIntelligenceService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * AI-powered query enhancement for interior design search
   */
  async enhanceSearchQuery(userQuery) {
    try {
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

Examples:
- "beautiful bedroom" → Add "modern bedroom", "traditional bedroom", "Indian bedroom decor", "cozy bedroom"
- "kitchen" → Add "modular kitchen", "Indian kitchen", "kitchen island", "granite countertop", "chimney"
- "sofa" → Add "diwan", "sectional sofa", "L-shaped sofa", "leather sofa", "fabric sofa"
- "traditional" → Add "Indian traditional", "ethnic decor", "wooden furniture", "brass items"

Focus on Indian interior design terms, regional styles, and culturally relevant furniture.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1000,
      });

      let content = response.choices[0].message.content.trim();
      
      // Clean up response if it has markdown
      if (content.includes("```json")) {
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      }

      const enhancedQuery = JSON.parse(content);
      
      // Add confidence metrics
      enhancedQuery.enhancement_confidence = this.calculateConfidence(userQuery, enhancedQuery);
      
      return enhancedQuery;
    } catch (error) {
      console.error("Error enhancing search query:", error);
      // Fallback to basic query if AI enhancement fails
      return this.createFallbackQuery(userQuery);
    }
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
   * Generate search suggestions for autocomplete
   */
  async generateSearchSuggestions(partialQuery, existingData) {
    try {
      if (!partialQuery || partialQuery.length < 2) {
        return this.getBasicSuggestions(existingData);
      }

      const prompt = `Based on this partial search query for Indian interior design: "${partialQuery}"

Suggest 10 relevant completions that users might be searching for. Focus on:
1. Indian interior design terms
2. Room types common in Indian homes
3. Popular furniture and decor items
4. Regional design styles
5. Materials and finishes

Return as JSON array: ["suggestion1", "suggestion2", ...]`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 300,
      });

      let content = response.choices[0].message.content.trim();
      if (content.includes("```json")) {
        content = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      }

      return JSON.parse(content);
    } catch (error) {
      console.error("Error generating search suggestions:", error);
      return this.getBasicSuggestions(existingData);
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
}

export default new SearchIntelligenceService(); 
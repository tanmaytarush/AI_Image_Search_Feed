import qdrantService from "./qdrantService.js";
import dotenv from "dotenv";
import { InferenceClient } from "@huggingface/inference";

dotenv.config();

class QueryIntelligenceService {
  constructor() {
    this.roomTypePatterns = new Map();
    this.designThemePatterns = new Map();
    this.queryHistory = [];
    this.learningEnabled = true;
    // Use HuggingFace Inference endpoint for chat/completions
    this.hf = new InferenceClient(process.env.HF_TOKEN);
    this.hfModel = "deepseek-ai/DeepSeek-V3-0324"; // Free, open-access chat completion model
  }

  /**
   * AI-powered intelligent search using GPT-3.5-turbo
   */
  async intelligentSearch(query, limit = 100, filters = {}) {
    try {
      console.log(`🤖 Starting AI-powered search for: "${query}"`);

      // Step 1: AI-powered room type detection
      const aiRoomDetection = await this.aiDetectRoomType(query);
      console.log(
        `🏠 AI detected room type: ${aiRoomDetection?.detectedRoom || "none"}`
      );

      // Step 2: AI-powered secondary keyword extraction
      const aiKeywords = await this.aiExtractKeywords(query);
      console.log(`🔍 AI extracted keywords: ${aiKeywords.join(", ")}`);

      // Step 3: Build enhanced filters with room type restriction
      const enhancedFilters = this.buildEnhancedFilters(
        filters,
        aiRoomDetection,
        aiKeywords
      );

      // Step 4: If AI detected a specific room type with high confidence, enforce room type filtering
      if (aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.7) {
        console.log(
          `🔒 Enforcing room type filter: ${aiRoomDetection.detectedRoom}`
        );
        enhancedFilters.room_type = aiRoomDetection.detectedRoom;
      }

      // Step 5: Perform search with enhanced filters
      const searchResults = await qdrantService.search(
        query,
        limit,
        enhancedFilters
      );

      // Step 6: AI-powered result ranking and enhancement
      const enhancedResults = await this.aiEnhanceResults(
        searchResults,
        query,
        aiRoomDetection,
        aiKeywords
      );

      return {
        results: enhancedResults,
        ai_insights: {
          detected_room: aiRoomDetection,
          extracted_keywords: aiKeywords,
          search_strategy: enhancedFilters.search_strategy,
          confidence_score: aiRoomDetection?.confidence || 0,
          room_type_filter_applied:
            aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.7,
        },
        original_query: query,
        enhanced_query: enhancedResults.enhanced_query,
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

Available room types in our database: ${existingRoomTypes.join(", ")}

All tags and variations in our database: ${allTags.join(", ")}

Task: Analyze the query and identify the MOST SPECIFIC and RELEVANT room type from the database. Be VERY PRECISE and RESTRICTIVE.

🚨 CRITICAL: For kids/children bedroom queries, treat "child's bedroom" and "bedroom" as EQUIVALENT - choose whichever exists in database. For bar unit queries, return null to let object matching find bar content.

🚨 CRITICAL RULES FOR FURNITURE/OBJECT QUERIES (MOST IMPORTANT):
1. If the query mentions furniture items (cabinet, table, chair, sofa, bed, wardrobe, etc.), DO NOT return a room type
2. If the query mentions decorative items (mirror, painting, lamp, vase, etc.), DO NOT return a room type
3. If the query mentions materials only (wood, marble, brass, etc.), DO NOT return a room type
4. If the query mentions colors only (red, blue, white, etc.), DO NOT return a room type
5. If the query mentions styles only (modern, traditional, contemporary, etc.), DO NOT return a room type
6. If the query is ambiguous or could be furniture/object OR room, return null
7. If the query contains ANY furniture-related words, return null for room type
8. EXCEPTION: "bar unit" queries should NOT be treated as furniture queries - return null for room type to let object matching find bar-related content like "wet bar", "vanity or wet bar"

🚨 CULTURAL ROOM QUERIES (SPECIAL HANDLING):
1. "pooja unit" → detectedRoom: "Temple or prayer room" (case-insensitive match)
2. "mandir unit" → detectedRoom: "Temple or prayer room" (case-insensitive match)
3. "temple unit" → detectedRoom: "Temple or prayer room" (case-insensitive match)
4. "prayer unit" → detectedRoom: "Temple or prayer room" (case-insensitive match)

ROOM TYPE MAPPING RULES:
- Map "pooja room" → "Temple or prayer room" (case-insensitive match)
- Map "mandir" → "Temple or prayer room" (case-insensitive match)
- Map "temple" → "Temple or prayer room" (case-insensitive match)
- Map "pooja" → "Temple or prayer room" (case-insensitive match)
- Map "prayer" → "Temple or prayer room" (case-insensitive match)
- Map "worship" → "worship room" (case-insensitive match)
- Map "prayer room" → "Temple or prayer room" (case-insensitive match)
- Map "prayer room/shrine" → "Temple or prayer room" (case-insensitive match)
- Map "indian kitchen" → "kitchen" (match exact database room types)
- Map "modern kitchen" → "kitchen" (match exact database room types)
- Map "traditional kitchen" → "kitchen" (match exact database room types)
- Map "child's bedroom" → "child's bedroom" (keep specific if exists)
- Map "kids bedroom" → "child's bedroom" (prefer specific if exists, otherwise "bedroom")
- Map "children bedroom" → "child's bedroom" (prefer specific if exists, otherwise "bedroom")
- Map "teenage bedroom" → "bedroom" (map to general bedroom)
- Map "master bedroom" → "bedroom" (map to general bedroom)
- Map "guest bedroom" → "bedroom" (map to general bedroom)
- Map "dining area" → "dining room" (match exact database room types)
- Map "living area" → "living room" (match exact database room types)
- Map "study room" → "home office" (match exact database room types)
- Map "work room" → "home office" (match exact database room types)

🚨 KIDS/CHILDREN'S BEDROOM FLEXIBILITY:
- For kids/children queries, treat "child's bedroom" and "bedroom" as EQUIVALENT
- "kids bedroom" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "children bedroom" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "child bedroom" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "kids room" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "children room" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "playful kids bedroom" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "kids bedroom design" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- The goal is to provide the BEST user experience with relevant results
- Both "child's bedroom" and "bedroom" are valid for kids/children queries
- Choose whichever exists in the database for better results

🚨 FURNITURE QUERIES SHOULD NEVER RETURN A ROOM TYPE:
- "bar unit" → detectedRoom: null, isFurnitureQuery: true
- "wardrobe" → detectedRoom: null, isFurnitureQuery: true
- "cabinet" → detectedRoom: null, isFurnitureQuery: true
- "table" → detectedRoom: null, isFurnitureQuery: true
- "chair" → detectedRoom: null, isFurnitureQuery: true

ROOM TYPE DETECTION RULES (ONLY for actual room queries):
1. If the query mentions ANY religious/spiritual terms (mandir, pooja, temple, prayer, worship, etc.), ONLY return "prayer room" or "pooja room"
2. If the query mentions kitchen-related terms, ONLY return "kitchen"
3. If the query mentions bedroom/sleeping terms, check for specificity:
   - If "kids", "children", "child" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
   - If "teenage", "teen" → return "bedroom" (general)
   - If "master", "adult" → return "bedroom" (general)
   - If just "bedroom" → return "bedroom" (general)
4. If the query mentions bathroom/washroom terms, ONLY return "bathroom"
5. If the query mentions living room/lounge terms, ONLY return "living room"
6. If the query mentions dining/eating terms, ONLY return "dining room"
7. If the query mentions study/work/office terms, ONLY return "home office"
8. If the query mentions entrance/entry/foyer terms, ONLY return "entryway"
9. If the query mentions balcony/terrace terms, ONLY return "balcony"
10. If the query mentions staircase/stair terms, ONLY return "staircase"

🚨 PRIORITIZE USER EXPERIENCE:
- "kids bedroom" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "children's bedroom" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "child bedroom" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "playful kids bedroom" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "kids bedroom design" → return "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "teenage bedroom" → "bedroom" (general)
- "master bedroom" → "bedroom" (general)

EXAMPLES OF WHAT TO RETURN NULL FOR:
- "bar unit" → null (furniture)
- "Luxury Indian bar unit designs" → null (furniture)
- "mirror wall" → null (decorative object)
- "wooden table" → null (furniture)
- "modern sofa" → null (furniture)
- "brass lamp" → null (decorative object)
- "red chair" → null (furniture)
- "marble countertop" → null (material/feature)
- "wardrobe" → null (furniture)
- "cabinet" → null (furniture)
- "shelf" → null (furniture)
- "designs" + furniture word → null (furniture)

EXAMPLES OF WHAT TO RETURN ROOM TYPES FOR:
- "modern living room" → "living room"
- "traditional kitchen" → "kitchen"
- "bedroom design" → "bedroom"
- "dining room setup" → "dining room"
- "kids bedroom" → "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "playful kids bedroom design ideas India" → "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "children bedroom" → "child's bedroom" (if exists) OR "bedroom" (both are equivalent)
- "pooja" → "Temple or prayer room"
- "mandir" → "Temple or prayer room"
- "temple" → "Temple or prayer room"
- "bar unit" → null (let object matching find "wet bar", "vanity or wet bar" content)

BE SMART ABOUT USER EXPERIENCE:
- Only return a room type if you are HIGHLY CONFIDENT (confidence > 0.8)
- If the query is ambiguous or could apply to multiple room types, return null
- If the query doesn't clearly specify a room type, return null
- If the query is about furniture/objects, return null
- If the query contains ANY furniture-related words, return null
- Prioritize the room type that will provide the BEST user experience
- For kids/children queries, choose the room type that will give the most relevant and useful results
- Consider the database content and choose wisely to maximize user satisfaction

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
- FIRST: Check if query is about furniture/objects (return null if yes)
- SECOND: Look for room type indicators
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
  "isRestrictive": true/false,
  "isFurnitureQuery": true/false,
  "furnitureType": "bar_unit/cabinet/table/etc" (if applicable)
}

🚨 CRITICAL RULES (MUST FOLLOW):
1. If "isFurnitureQuery" is true, then "detectedRoom" MUST be null
2. If "detectedRoom" is not null, then "isFurnitureQuery" MUST be false
3. Set "isFurnitureQuery" to true if the query is about furniture, objects, or decorative items
4. Set "furnitureType" to the specific furniture item mentioned (e.g., "wardrobe", "bar unit", "mirror")
5. If the query contains ANY furniture-related words, set "isFurnitureQuery" to true and "detectedRoom" to null
6. FURNITURE QUERIES SHOULD NEVER RETURN A ROOM TYPE - ALWAYS SET detectedRoom TO null

EXAMPLE RESPONSE FOR FURNITURE QUERY:
Query: "wardrobe"
Response: {
  "detectedRoom": null,
  "confidence": 1,
  "reasoning": "The query mentions 'wardrobe' which is a furniture item, not a room type. Furniture queries should not return room types.",
  "alternativeMatches": [],
  "culturalContext": "",
  "matchedKeywords": ["wardrobe"],
  "databaseTagsUsed": [],
  "searchStrategy": "Identified as furniture query, no room type detection needed",
  "isRestrictive": true,
  "isFurnitureQuery": true,
  "furnitureType": "wardrobe"
}

If no clear match is found, set "detectedRoom" to null and explain why, listing all the variations you considered.`;

      const response = await this.callGPT35(prompt);
      const aiResponse = JSON.parse(response);

      return aiResponse;
    } catch (error) {
      console.error("Error in AI room detection:", error);
      return {
        detectedRoom: null,
        confidence: 0,
        reasoning: "AI detection failed",
      };
    }
  }

  /**
   * AI-powered keyword extraction using GPT-3.5-turbo
   */
  async aiExtractKeywords(query) {
    try {
      console.log(`🔍 AI Keyword Extraction: Starting for query "${query}"`);
      const allTags = await this.getAllDatabaseTags();
      console.log(
        `🔍 AI Keyword Extraction: Got ${allTags.length} database tags`
      );

      const prompt = `You are an expert interior design assistant specializing in Indian interior design. Extract relevant keywords from this query: "${query}"

Available database tags and variations: ${allTags.join(", ")}

Task: Extract keywords and categorize them properly for search matching.

IMPORTANT RULES FOR COMPOUND TERMS:
1. If the query contains "pooja unit", "mandir unit", "temple unit" - these are CULTURAL ROOM terms, NOT objects
2. "unit" in cultural contexts is just a modifier, not a separate object - DO NOT put "unit" in objects array
3. For cultural/religious terms, consider all synonyms: pooja/puja/mandir/temple/prayer/worship
4. For "bar unit", "tv unit" - these are specific furniture items, extract as objects
5. NEVER put "unit" alone in objects array - only put it there if it's part of a furniture term like "bar unit"

🚨 CRITICAL ROOM TYPE CATEGORIZATION:
- Room types like "bedroom", "kitchen", "living room", "dining room", "bathroom" should NOT go in cultural_room
- Room types like "bedroom", "kitchen", "living room" should NOT go in objects array
- Only religious/cultural room terms like "pooja", "mandir", "temple", "prayer" should go in cultural_room
- Room types should be handled by the room type detection system, not keyword extraction

🚨 CRITICAL OBJECT CATEGORIZATION:
- "bedroom" is a ROOM TYPE, not an object - NEVER put it in objects array
- "design" and "ideas" are FEATURES, not objects - put them in features array
- "organization" and "hacks" are FEATURES, not objects - put them in features array
- "room organization hacks" should be split: "organization" and "hacks" go in features, NOT as a single object
- Only actual furniture/objects like "bed", "wardrobe", "table", "chair" should go in objects array
- Compound phrases like "room organization hacks" should be broken down into individual meaningful terms
- For complex queries, focus on common furniture/objects that are likely to exist in the database
- Avoid overly specific terms like "hacks", "organization" unless they are common in interior design databases
- For room-based queries, extract FEWER objects to avoid over-filtering (max 2-3 objects)
- For "kids bedroom" queries, prefer basic furniture like "bed", "wardrobe" over specific items

🚨 CRITICAL CULTURAL CATEGORIZATION:
- "kids" is a DEMOGRAPHIC/TARGET AUDIENCE, not a cultural room term
- "India" is a LOCATION/COUNTRY, not a cultural room term
- Only religious/spiritual terms like "pooja", "mandir", "temple", "prayer" should go in cultural_room

CATEGORIZATION RULES:
- CULTURAL/ROOM keywords: ONLY religious/spiritual terms like pooja, puja, mandir, temple, prayer, worship, religious, spiritual, cultural, traditional, indian, hindu
- OBJECT keywords: Only actual furniture/objects like bar unit, tv unit, cabinet, table, chair, sofa, bed, wardrobe, shelf, mirror, lamp
- STYLE keywords: modern, traditional, contemporary, minimalist, classic, rustic, playful, elegant, cozy
- MATERIAL keywords: wood, metal, fabric, stone, glass, plastic, marble, brass
- COLOR keywords: specific colors and color families
- FEATURE keywords: design, lighting, storage, seating, cooking, working, ideas, concepts

Return ONLY a JSON object with categorized keywords:
{
  "cultural_room": ["pooja", "puja", "mandir", "temple", "prayer", "worship"],
  "objects": ["bar unit", "cabinet", "table"],
  "styles": ["modern", "traditional"],
  "materials": ["wood", "marble"],
  "colors": ["white", "brown"],
  "features": ["design", "lighting"]
}

Example:
Query: "pooja unit design"
Response: {
  "cultural_room": ["pooja", "puja", "mandir", "temple", "prayer", "worship", "religious", "spiritual", "cultural", "traditional", "indian", "hindu"],
  "objects": [],
  "styles": ["traditional"],
  "materials": [],
  "colors": [],
  "features": ["design"]
}

Query: "bar unit"
Response: {
  "cultural_room": [],
  "objects": ["bar unit", "bar", "cabinet", "storage"],
  "styles": [],
  "materials": [],
  "colors": [],
  "features": ["storage"]
}

Query: "bedroom"
Response: {
  "cultural_room": [],
  "objects": ["bed", "wardrobe"],
  "styles": ["modern", "traditional"],
  "materials": ["wood", "metal"],
  "colors": [],
  "features": ["design"]
}

Query: "Playful kids bedroom design ideas India"
Response: {
  "cultural_room": [],
  "objects": ["bed", "wardrobe"],
  "styles": ["playful", "modern", "traditional"],
  "materials": ["wood", "plastic", "fabric"],
  "colors": ["bright", "colorful"],
  "features": ["design", "ideas"]
}

Query: "kitchen"
Response: {
  "cultural_room": [],
  "objects": ["cabinet", "counter", "appliance"],
  "styles": ["modern", "traditional"],
  "materials": ["wood", "stone", "metal"],
  "colors": [],
  "features": ["cooking", "storage"]
}

Query: "Small space kids room organization hacks"
Response: {
  "cultural_room": [],
  "objects": ["bed", "wardrobe"],
  "styles": ["modern", "minimalist"],
  "materials": ["wood", "plastic", "metal"],
  "colors": [],
  "features": ["design", "storage"]
}

🚨 IMPORTANT: Do NOT extract "organization" or "hacks" as features - these terms don't exist in interior design databases. Focus on common design terms like "design", "storage", "lighting", etc.

🚨 ROOM-BASED QUERY FLEXIBILITY:
- For room-based queries (like "kids bedroom", "kitchen", "living room"), be LESS specific with objects
- Focus on the most common furniture items that are likely to exist in that room type
- Don't extract too many specific objects that might filter out valid results
- For "kids bedroom" queries, focus on basic furniture like "bed", "wardrobe" rather than specific items like "toys", "storage"

CRITICAL: 
- Room types like "bedroom", "kitchen", "living room" should NOT be in cultural_room array
- Room types like "bedroom", "kitchen", "living room" should NOT be in objects array
- Only religious/cultural terms should be in cultural_room array
- "kids" and "India" are NOT cultural room terms
- "design" and "ideas" are features, not objects
- For "pooja unit", "mandir unit", "temple unit" - the "unit" is NOT an object, it's just a modifier. Only put "unit" in objects array if it's part of a furniture term like "bar unit".`;

      console.log(`🔍 AI Keyword Extraction: Calling GPT-3.5-turbo...`);
      const response = await this.callGPT35(prompt);
      console.log(`🔍 AI Keyword Extraction: Got response: ${response}`);

      const keywords = JSON.parse(response);
      console.log(
        `🔍 AI Keyword Extraction: Parsed keywords: ${JSON.stringify(keywords)}`
      );

      // Return the structured categorized response instead of flattening
      // This allows downstream services to use the AI's categorization properly
      console.log(
        `🔍 AI Keyword Extraction: Returning structured categorized response`
      );
      return keywords;
    } catch (error) {
      console.error("Error in AI keyword extraction:", error);
      console.error("Error details:", error.message);
      return [];
    }
  }

  /**
   * AI-powered result enhancement and ranking
   */
  async aiEnhanceResults(
    searchResults,
    originalQuery,
    aiRoomDetection,
    aiKeywords
  ) {
    try {
      if (!searchResults.results || searchResults.results.length === 0) {
        return searchResults;
      }

      const allTags = await this.getAllDatabaseTags();

      const prompt = `You are an expert interior design assistant. 

Original Query: "${originalQuery}"
AI Detected Room: ${aiRoomDetection?.detectedRoom || "none"}
AI Extracted Keywords: ${
        typeof aiKeywords === "object"
          ? JSON.stringify(aiKeywords)
          : aiKeywords.join(", ")
      }
Available Database Tags: ${allTags.join(", ")}

I have ${
        searchResults.results.length
      } search results. For each result, analyze how well it matches the user's intent by considering ALL possible variations and database tags.

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
          ai_confidence_factors: enhanced.confidence_factors || [],
        };
      });

      // Sort by AI relevance score
      enhancedResults.sort(
        (a, b) => (b.ai_relevance_score || 0) - (a.ai_relevance_score || 0)
      );

      return {
        ...searchResults,
        results: enhancedResults,
        enhanced_query: enhancedData.enhanced_query || originalQuery,
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

    // Don't apply room type filters for furniture queries
    if (aiRoomDetection?.isFurnitureQuery) {
      console.log(
        `🔒 Skipping room type filter for furniture query: ${aiRoomDetection.furnitureType}`
      );
    } else {
      // Add AI-detected room type to filters with high confidence threshold
      // Only add simple key-value pairs that Qdrant can handle
      if (aiRoomDetection?.detectedRoom && aiRoomDetection.confidence > 0.7) {
        enhancedFilters.room_type = aiRoomDetection.detectedRoom;
        console.log(
          `🔒 Room type filter applied: ${aiRoomDetection.detectedRoom} (confidence: ${aiRoomDetection.confidence})`
        );
      }
    }

    // Add design theme if detected from keywords
    if (aiKeywords && aiKeywords.length > 0) {
      const designKeywords = aiKeywords.filter((keyword) =>
        [
          "modern",
          "traditional",
          "contemporary",
          "indian",
          "minimalist",
          "classic",
        ].includes(keyword.toLowerCase())
      );
      if (designKeywords.length > 0) {
        enhancedFilters.design_theme = designKeywords[0]; // Use first matching design keyword
      }
    }

    return enhancedFilters;
  }

  /**
   * Call HuggingFace chatCompletion API (replaces OpenAI)
   */
  async callGPT35(prompt) {
    try {
      const response = await this.hf.chatCompletion({
        model: this.hfModel,
        messages: [
          {
            role: "system",
            content:
              "You are an expert interior design assistant specializing in Indian interior design. Always respond with valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });
      return response.choices[0].message.content;
    } catch (error) {
      console.error("Error calling HuggingFace chatCompletion:", error);
      throw error;
    }
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
      "pooja room design",
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
          result_count: result.results?.length || 0,
        });
      } catch (error) {
        results.push({
          query,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      total_tests: queries.length,
      successful_tests: results.filter((r) => r.success).length,
      failed_tests: results.filter((r) => !r.success).length,
      results,
    };
  }

  /**
   * Get existing room types from Qdrant data (required for AI context)
   */
  async getExistingRoomTypes() {
    try {
      const response = await qdrantService.client.scroll("interior_images", {
        limit: 1000,
        with_payload: true,
        with_vector: false,
      });

      const roomTypes = new Set();
      response.points.forEach((point) => {
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
   * Get all tags and variations from the database (required for AI context)
   */
  async getAllDatabaseTags() {
    try {
      const response = await qdrantService.client.scroll("interior_images", {
        limit: 1000,
        with_payload: true,
        with_vector: false,
      });

      const allTags = new Set();

      response.points.forEach((point) => {
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
          point.payload.tags.forEach((tag) => {
            allTags.add(tag.toLowerCase());
          });
        }

        // Add description keywords
        if (point.payload.description) {
          const words = point.payload.description.toLowerCase().split(/\s+/);
          words.forEach((word) => {
            if (word.length > 2) {
              // Only meaningful words
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
          if (
            aiTags.primary_features &&
            Array.isArray(aiTags.primary_features)
          ) {
            aiTags.primary_features.forEach((feature) => {
              allTags.add(feature.toLowerCase());
            });
          }

          // Object types and features
          if (aiTags.objects && Array.isArray(aiTags.objects)) {
            aiTags.objects.forEach((obj) => {
              if (obj.type) allTags.add(obj.type.toLowerCase());
              if (obj.features && Array.isArray(obj.features)) {
                obj.features.forEach((feature) => {
                  allTags.add(feature.toLowerCase());
                });
              }
              if (obj.materials && Array.isArray(obj.materials)) {
                obj.materials.forEach((material) => {
                  allTags.add(material.toLowerCase());
                });
              }
            });
          }

          // Visual attributes
          if (aiTags.visual_attributes) {
            const va = aiTags.visual_attributes;
            if (va.colors && Array.isArray(va.colors)) {
              va.colors.forEach((color) => allTags.add(color.toLowerCase()));
            }
            if (va.materials && Array.isArray(va.materials)) {
              va.materials.forEach((material) =>
                allTags.add(material.toLowerCase())
              );
            }
            if (va.lighting) allTags.add(va.lighting.toLowerCase());
            if (va.texture) allTags.add(va.texture.toLowerCase());
          }

          // Indian context
          if (aiTags.indian_context) {
            const ic = aiTags.indian_context;
            if (ic.regional_style) allTags.add(ic.regional_style.toLowerCase());
            if (ic.space_utilization)
              allTags.add(ic.space_utilization.toLowerCase());
            if (
              ic.traditional_elements &&
              Array.isArray(ic.traditional_elements)
            ) {
              ic.traditional_elements.forEach((element) => {
                allTags.add(element.toLowerCase());
              });
            }
            if (ic.modern_adaptations && Array.isArray(ic.modern_adaptations)) {
              ic.modern_adaptations.forEach((adaptation) => {
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
}

export default new QueryIntelligenceService();

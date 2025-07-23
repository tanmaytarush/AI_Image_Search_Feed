import qdrantService from "./qdrantService.js";

class QueryIntelligenceService {
  constructor() {
    this.roomTypePatterns = new Map();
    this.designThemePatterns = new Map();
    this.queryHistory = [];
    this.learningEnabled = true;
  }

  /**
   * Dynamically detect room types from query using multiple strategies
   */
  async detectRoomType(query) {
    const queryLower = query.toLowerCase();

    // Strategy 1: Check against existing data in Qdrant
    const existingRoomTypes = await this.getExistingRoomTypes();
    const detectedFromData = this.matchAgainstExistingData(
      queryLower,
      existingRoomTypes
    );

    // Strategy 2: Use semantic similarity with existing room types
    const semanticMatch = await this.findSemanticMatch(
      queryLower,
      existingRoomTypes
    );

    // Strategy 3: Pattern-based detection (fallback)
    const patternMatch = this.patternBasedDetection(queryLower);

    // Strategy 4: Learn from query history
    const historicalMatch = this.learnFromQueryHistory(queryLower);

    // Combine results with priority
    const results = [
      { type: detectedFromData, confidence: 0.9, source: "data_match" },
      { type: semanticMatch, confidence: 0.8, source: "semantic" },
      { type: patternMatch, confidence: 0.7, source: "pattern" },
      { type: historicalMatch, confidence: 0.6, source: "history" },
    ].filter((r) => r.type);

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
   * AI-powered search context detection
   * Determines if query is for: room-specific, furniture/object, or general search
   */
  async determineSearchContext(query) {
    try {
      const prompt = `Analyze this interior design search query and determine the search context:

Query: "${query}"

Please classify the search intent into one of these categories:

1. ROOM_SPECIFIC - User is looking for a specific room type (e.g., "modern living room", "kitchen designs", "pooja room", "mandir")
2. FURNITURE_OBJECT - User is looking for furniture or objects that can be in multiple rooms (e.g., "wardrobe designs", "sofa styles", "dining table")
3. GENERAL_SEARCH - User is looking for general design concepts (e.g., "modern indian", "minimalist design")

Consider these factors:
- If query mentions specific room types (bedroom, kitchen, living room, etc.) → ROOM_SPECIFIC
- If query mentions furniture/objects that exist in multiple rooms (wardrobe, sofa, table, chair, etc.) → FURNITURE_OBJECT  
- If query is about style/theme without room context → GENERAL_SEARCH
- If query combines room + furniture (e.g., "bedroom wardrobe") → ROOM_SPECIFIC

IMPORTANT INDIAN CULTURAL CONTEXT:
- "pooja room", "prayer room", "mandir", "temple room" → These are ROOM_SPECIFIC (dedicated spaces)
- "pooja unit", "mandir unit", "prayer unit" → These are ROOM_SPECIFIC (referring to the room/space)
- "pooja furniture", "mandir furniture" → These are FURNITURE_OBJECT (referring to furniture within the room)

Respond with only the category name: ROOM_SPECIFIC, FURNITURE_OBJECT, or GENERAL_SEARCH`;

      // Use OpenAI to analyze the query context
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-3.5-turbo",
            messages: [
              {
                role: "system",
                content:
                  "You are an expert interior design search analyzer with deep understanding of Indian cultural context. Respond with only the category name.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            max_tokens: 10,
            temperature: 0.1,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const context = data.choices[0].message.content.trim().toUpperCase();

      console.log(
        `🤖 AI detected search context: ${context} for query: "${query}"`
      );

      return context;
    } catch (error) {
      console.error("Error determining search context:", error);

      // Fallback to pattern-based detection
      return this.fallbackContextDetection(query);
    }
  }

  /**
   * Fallback context detection using patterns
   */
  fallbackContextDetection(query) {
    const queryLower = query.toLowerCase();

    // Room type patterns (including Indian cultural rooms)
    const roomPatterns = [
      "living room",
      "bedroom",
      "kitchen",
      "bathroom",
      "dining room",
      "home office",
      "study",
      "entryway",
      "foyer",
      "balcony",
      "terrace",
      "pooja room",
      "prayer room",
      "mandir",
      "temple room",
      "closet",
      "wardrobe room",
      "pooja unit",
      "mandir unit",
      "prayer unit",
      "temple unit",
    ];

    // Furniture/object patterns
    const furniturePatterns = [
      "wardrobe",
      "closet",
      "cabinet",
      "shelf",
      "sofa",
      "couch",
      "dining table",
      "coffee table",
      "bed",
      "chair",
      "desk",
      "table",
      "mirror",
      "lighting",
      "lamp",
      "curtain",
      "blind",
      "carpet",
      "rug",
      "painting",
      "art",
      "vase",
      "plant",
      "decor",
      "furniture",
      "storage",
    ];

    // Check for room-specific patterns
    const hasRoomPattern = roomPatterns.some((pattern) =>
      queryLower.includes(pattern)
    );
    if (hasRoomPattern) {
      return "ROOM_SPECIFIC";
    }

    // Check for furniture/object patterns
    const hasFurniturePattern = furniturePatterns.some((pattern) =>
      queryLower.includes(pattern)
    );
    if (hasFurniturePattern) {
      return "FURNITURE_OBJECT";
    }

    // Default to general search
    return "GENERAL_SEARCH";
  }

  /**
   * Get existing room types from Qdrant data
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
      const words = query.split(" ");
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
        const similarity = this.calculateCosineSimilarity(
          queryEmbedding,
          embedding
        );
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
      bedroom: ["bed", "sleep", "master", "guest", "study room"],
      kitchen: ["kitchen", "cook", "culinary", "modular"],
      "living room": ["living", "lounge", "family", "drawing"],
      bathroom: ["bath", "toilet", "washroom", "powder"],
      "dining room": ["dining", "eat", "dinner"],
      "home office": ["office", "study", "work", "workspace"],
      entrance: ["entrance", "entry", "foyer", "hall"],
      staircase: ["stair", "steps"],
      balcony: ["balcony", "terrace", "veranda"],
      "prayer room": ["pooja", "mandir", "temple", "prayer"],
    };

    for (const [roomType, keywords] of Object.entries(patterns)) {
      if (keywords.some((keyword) => query.includes(keyword))) {
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
    const similarQueries = this.queryHistory.filter(
      (entry) => this.calculateStringSimilarity(query, entry.query) > 0.6
    );

    if (similarQueries.length > 0) {
      // Return the most common room type from similar queries
      const roomTypeCounts = {};
      similarQueries.forEach((entry) => {
        if (entry.detectedRoomType) {
          roomTypeCounts[entry.detectedRoomType] =
            (roomTypeCounts[entry.detectedRoomType] || 0) + 1;
        }
      });

      const mostCommon = Object.entries(roomTypeCounts).sort(
        ([, a], [, b]) => b - a
      )[0];

      return mostCommon ? mostCommon[0] : null;
    }

    return null;
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  calculateStringSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().split(" "));
    const words2 = new Set(str2.toLowerCase().split(" "));

    const intersection = new Set([...words1].filter((x) => words2.has(x)));
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
      timestamp: Date.now(),
    });

    // Keep only recent history (last 1000 queries)
    if (this.queryHistory.length > 1000) {
      this.queryHistory = this.queryHistory.slice(-1000);
    }

    // Update patterns based on successful matches
    if (detectedRoomType) {
      const words = query.toLowerCase().split(" ");
      words.forEach((word) => {
        if (word.length > 2) {
          // Only meaningful words
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

    this.queryHistory.forEach((entry) => {
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
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10),
      learnedPatterns: Object.fromEntries(
        Array.from(this.roomTypePatterns.entries()).map(
          ([roomType, patterns]) => [roomType, Array.from(patterns)]
        )
      ),
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
}

export default new QueryIntelligenceService();

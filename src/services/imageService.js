import path, { dirname } from "path";
import { fileURLToPath } from "url";
import {
  constructImageUrl,
  getValidatedEmbedding,
} from "../utils/imageServiceUtils.js";
import qdrantService from "./qdrantService.js";

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
   * Production-ready multi-vector search with intelligent weighting
   */
  async searchImages(query, limit = 100) {
    try {
      if (!query || query.trim().length === 0) {
        throw new Error("Search query is required");
      }

      // Store current search query for room type relevance boost
      this.currentSearchQuery = query.trim();

      console.log(`🤖 Production-ready multi-vector search for: "${query}"`);

      // Generate embeddings for ALL vector fields
      const [
        primaryEmbedding,
        semanticEmbedding,
        objectEmbedding,
        visualEmbedding,
      ] = await Promise.all([
        getValidatedEmbedding(query.trim(), "primary_search"),
        getValidatedEmbedding(query.trim(), "semantic_desc"),
        getValidatedEmbedding(query.trim(), "object_focus"),
        getValidatedEmbedding(query.trim(), "visual_features"),
      ]);

      // AI-powered vector analysis for intelligent weighting
      const vectorAnalysis = await this.analyzeVectorRelevance(query.trim(), {
        primary_search: primaryEmbedding,
        semantic_desc: semanticEmbedding,
        object_focus: objectEmbedding,
        visual_features: visualEmbedding,
      });

      console.log(
        `🎯 Vector analysis: ${JSON.stringify(vectorAnalysis.weights)}`
      );

      // HYBRID SEARCH: Text-based + Visual similarity search

      // 1. TEXT-BASED SEARCHES (3 vectors)
      const textSearches = await Promise.all([
        qdrantService.client.search("interior_images_description", {
          vector: { name: "primary_search", vector: primaryEmbedding },
          limit: limit * 2,
          with_payload: true,
          with_vector: false,
          score_threshold: 0.3,
        }),
        qdrantService.client.search("interior_images_description", {
          vector: { name: "semantic_desc", vector: semanticEmbedding },
          limit: limit * 2,
          with_payload: true,
          with_vector: false,
          score_threshold: 0.3,
        }),
        qdrantService.client.search("interior_images_description", {
          vector: { name: "object_focus", vector: objectEmbedding },
          limit: limit * 2,
          with_payload: true,
          with_vector: false,
          score_threshold: 0.3,
        }),
      ]);

      // 2. VISUAL SIMILARITY SEARCH (using multiple strategies)
      const visualSearchResults = await this.performVisualSimilaritySearch(
        query.trim(),
        limit * 2
      );

      // 3. COMBINE ALL SEARCHES
      const searches = [...textSearches, visualSearchResults];

      // Debug: Log search results
      console.log(
        `🔍 Text searches: ${textSearches.length} (${textSearches
          .map((s) => s.length)
          .join(", ")} results each)`
      );
      console.log(`🎨 Visual search: ${visualSearchResults.length} results`);
      console.log(`🎯 Total searches to fuse: ${searches.length}`);

      // Combine and weight results using fusion algorithm
      const results = await this.fuseMultiVectorResults(
        searches,
        vectorAnalysis.weights,
        limit
      );

      // Format results
      const formattedResults = [];
      for (const result of results) {
        const formatted = await this.formatEnhancedResult(result);
        formattedResults.push(formatted);
      }

      // Generate comprehensive search metadata
      const searchMetadata = {
        query: query.trim(),
        total_results: formattedResults.length,
        search_strategy: "production_multi_vector_search",
        vector_analysis: {
          weights: vectorAnalysis.weights,
          reasoning: vectorAnalysis.reasoning,
          query_intent: vectorAnalysis.queryIntent,
        },
        search_components: {
          total_vectors_used: 4,
          vectors_available: [
            "primary_search",
            "semantic_desc",
            "object_focus",
            "visual_features",
          ],
          search_quality: {
            threshold: 0.3,
            average_score: this.calculateAverageScore(results),
            score_distribution: this.analyzeScoreDistribution(results),
          },
        },
        context_preservation: true,
      };

      return {
        images: formattedResults,
        message: `Found ${
          formattedResults.length
        } relevant results for "${query.trim()}" using production multi-vector search`,
        search_metadata: searchMetadata,
      };
    } catch (error) {
      console.error("Error in production search:", error);
      throw error;
    }
  }

  /**
   * Production-ready vector analysis for intelligent weighting
   */
  async analyzeVectorRelevance(query, embeddings) {
    try {
      // Generate a comprehensive query embedding for analysis
      const queryEmbedding = await getValidatedEmbedding(
        query,
        "intent_analysis"
      );

      // Define vector purposes with production-level specificity
      const vectorPurposes = {
        primary_search:
          "room types, spatial concepts, functional spaces, architectural elements",
        semantic_desc:
          "design styles, cultural themes, aesthetic concepts, mood and atmosphere",
        object_focus:
          "specific objects, furniture types, fixtures, material specifications",
        visual_features:
          "colors, textures, lighting, spatial relationships, visual composition",
      };

      // Generate embeddings for each vector's purpose
      const purposeEmbeddings = {};
      for (const [vectorName, purpose] of Object.entries(vectorPurposes)) {
        purposeEmbeddings[vectorName] = await getValidatedEmbedding(
          purpose,
          "intent_analysis"
        );
      }

      // Calculate semantic similarity scores
      const similarityScores = {};
      for (const [vectorName, purposeEmbedding] of Object.entries(
        purposeEmbeddings
      )) {
        similarityScores[vectorName] = this.calculateCosineSimilarity(
          queryEmbedding,
          purposeEmbedding
        );
      }

      // Analyze query intent using AI
      const intentAnalysis = await this.aiAnalyzeQueryIntent(query);

      // Production-ready weighting algorithm using AI intent
      const weights = this.calculateProductionWeights(
        query,
        similarityScores,
        intentAnalysis.intent
      );

      // Generate reasoning for production logging
      const reasoning = this.generateProductionReasoning(
        weights,
        similarityScores,
        intentAnalysis
      );

      return {
        weights,
        reasoning,
        queryIntent: intentAnalysis.intent,
        similarityScores,
        intentConfidence: intentAnalysis.confidence,
      };
    } catch (error) {
      console.error("Error in vector analysis:", error);
      // Fallback to balanced weights
      return {
        weights: {
          primary_search: 1.0,
          semantic_desc: 0.8,
          object_focus: 0.8,
          visual_features: 0.7,
        },
        reasoning: "Fallback to balanced weights due to analysis error",
        queryIntent: "general",
        similarityScores: {
          primary_search: 0.8,
          semantic_desc: 0.7,
          object_focus: 0.7,
          visual_features: 0.6,
        },
        intentConfidence: 0.5,
      };
    }
  }

  /**
   * Production-ready weighting algorithm using AI intent
   */
  calculateProductionWeights(query, similarityScores, queryIntent) {
    // Start with base weights from semantic similarity
    let weights = { ...similarityScores };

    // Apply AI-determined intent-based adjustments
    switch (queryIntent) {
      case "room_specific":
        weights.primary_search *= 1.5; // Boost room-specific vector
        weights.semantic_desc *= 1.2; // Boost style/theme vector
        break;

      case "object_specific":
        weights.object_focus *= 1.5; // Boost object-specific vector
        weights.primary_search *= 1.1; // Slight boost to primary
        break;

      case "style_specific":
        weights.semantic_desc *= 1.4; // Boost style vector
        weights.visual_features *= 1.2; // Boost visual features
        break;

      case "visual_specific":
        weights.visual_features *= 1.5; // Boost visual features
        weights.object_focus *= 1.1; // Slight boost to objects
        break;

      case "general":
      default:
        // Balanced weights for general queries
        weights.primary_search *= 1.1;
        weights.semantic_desc *= 1.1;
        weights.object_focus *= 1.1;
        weights.visual_features *= 1.1;
        break;
    }

    // Normalize weights to sum to 4.0 (Qdrant requirement)
    const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
    const normalizedWeights = {};
    for (const [key, weight] of Object.entries(weights)) {
      normalizedWeights[key] = (weight / totalWeight) * 4.0;
    }

    return normalizedWeights;
  }

  /**
   * Production-ready query intent analysis using AI models
   */
  async analyzeQueryIntent(query) {
    try {
      // Use AI model to understand query intent dynamically
      const intentAnalysis = await this.aiAnalyzeQueryIntent(query);
      return intentAnalysis.intent;
    } catch (error) {
      console.error("Error in AI intent analysis:", error);
      return "general"; // Fallback
    }
  }

  /**
   * AI-powered query intent analysis - no hardcoded rules
   */
  async aiAnalyzeQueryIntent(query) {
    try {
      // Generate embedding for the query
      const queryEmbedding = await getValidatedEmbedding(
        query,
        "intent_analysis"
      );

      // Define intent categories with AI descriptions
      const intentCategories = {
        room_specific:
          "queries about specific room types, spaces, or architectural areas",
        object_specific:
          "queries about furniture, fixtures, decorative items, or specific objects",
        style_specific:
          "queries about design styles, themes, aesthetics, or cultural elements",
        visual_specific:
          "queries about colors, materials, textures, lighting, or visual attributes",
        general: "general queries that don't fit specific categories",
      };

      // Generate embeddings for each intent category
      const categoryEmbeddings = {};
      for (const [intent, description] of Object.entries(intentCategories)) {
        categoryEmbeddings[intent] = await getValidatedEmbedding(
          description,
          "intent_analysis"
        );
      }

      // Calculate similarity between query and each intent category
      const intentScores = {};
      for (const [intent, categoryEmbedding] of Object.entries(
        categoryEmbeddings
      )) {
        intentScores[intent] = this.calculateCosineSimilarity(
          queryEmbedding,
          categoryEmbedding
        );
      }

      // Find the intent with highest similarity
      const bestIntent = Object.entries(intentScores).reduce(
        (best, [intent, score]) =>
          score > best.score ? { intent, score } : best,
        { intent: "general", score: 0 }
      );

      // Only return specific intent if confidence is high enough
      if (bestIntent.score > 0.7) {
        return {
          intent: bestIntent.intent,
          confidence: bestIntent.score,
          allScores: intentScores,
        };
      }

      return {
        intent: "general",
        confidence: bestIntent.score,
        allScores: intentScores,
      };
    } catch (error) {
      console.error("Error in AI intent analysis:", error);
      throw error;
    }
  }

  /**
   * Perform intelligent visual similarity search using multiple strategies
   */
  async performVisualSimilaritySearch(query, limit) {
    try {
      console.log(`🎨 Performing visual similarity search for: "${query}"`);

      let allVisualResults = [];

      // Strategy 1: Enhanced text-to-visual mapping
      try {
        const visualQueryMapping = await this.createEnhancedVisualQuery(query);
        const visualQueryEmbedding = await getValidatedEmbedding(
          visualQueryMapping,
          "visual_features"
        );

        // AI-based dynamic threshold calculation
        const dynamicThreshold = await this.calculateDynamicThreshold(
          visualQueryEmbedding
        );

        const enhancedResults = await qdrantService.client.search(
          "interior_images_description",
          {
            vector: { name: "visual_features", vector: visualQueryEmbedding },
            limit: limit,
            with_payload: true,
            with_vector: false,
            score_threshold: dynamicThreshold,
          }
        );

        console.log(
          `🎨 Enhanced visual search: ${enhancedResults.length} results`
        );
        allVisualResults = [...allVisualResults, ...enhancedResults];
      } catch (error) {
        console.log(`⚠️ Enhanced visual search failed: ${error.message}`);
      }

      // Strategy 2: Simple text query with AI-calculated threshold
      try {
        const simpleVisualEmbedding = await getValidatedEmbedding(
          `interior design ${query}`,
          "visual_features"
        );

        // AI-based threshold for simple query
        const simpleThreshold = await this.calculateDynamicThreshold(
          simpleVisualEmbedding
        );

        const simpleResults = await qdrantService.client.search(
          "interior_images_description",
          {
            vector: { name: "visual_features", vector: simpleVisualEmbedding },
            limit: limit,
            with_payload: true,
            with_vector: false,
            score_threshold: Math.min(simpleThreshold + 0.02, 0.15), // Slightly higher for simple queries
          }
        );

        console.log(`🎨 Simple visual search: ${simpleResults.length} results`);
        allVisualResults = [...allVisualResults, ...simpleResults];
      } catch (error) {
        console.log(`⚠️ Simple visual search failed: ${error.message}`);
      }

      // Remove duplicates and limit results
      const uniqueResults = this.removeDuplicateResults(allVisualResults);
      const finalResults = uniqueResults.slice(0, limit);

      console.log(`🎨 Total visual search results: ${finalResults.length}`);
      return finalResults;
    } catch (error) {
      console.error("Error in visual similarity search:", error);
      return [];
    }
  }

  /**
   * Remove duplicate results based on image ID
   */
  removeDuplicateResults(results) {
    const uniqueMap = new Map();
    results.forEach((result) => {
      if (!uniqueMap.has(result.id)) {
        uniqueMap.set(result.id, result);
      }
    });
    return Array.from(uniqueMap.values());
  }

  /**
   * Map text query to visual characteristics for better visual search
   */
  async createEnhancedVisualQuery(query) {
    try {
      // Use AI to understand query intent and generate visual context dynamically
      const intentAnalysis = await this.aiAnalyzeQueryIntent(query);

      // Pure AI approach - no hardcoded mappings
      let visualContext = `Interior design visual search: ${query}`;

      // Add AI-determined context based on confidence level
      if (intentAnalysis.confidence > 0.7) {
        visualContext += ` visual elements architectural details spatial composition`;
      }

      console.log(`🎨 AI-generated visual query: "${visualContext}"`);
      return visualContext;
    } catch (error) {
      console.error("Error creating visual query:", error);
      return `Interior design visual search: ${query}`;
    }
  }

  /**
   * Calculate dynamic threshold based on embedding characteristics - no hardcoding
   */
  async calculateDynamicThreshold(embedding) {
    try {
      // Calculate embedding magnitude and variance to understand query complexity
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      const mean =
        embedding.reduce((sum, val) => sum + val, 0) / embedding.length;
      const variance =
        embedding.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
        embedding.length;

      // Normalize to threshold range (0.02 to 0.15)
      // Higher complexity (higher variance) = lower threshold for better recall
      const complexityScore = Math.min(Math.max(variance * 10, 0), 1);
      const threshold = 0.15 - complexityScore * 0.13; // Maps 0-1 to 0.15-0.02

      return Math.max(0.02, Math.min(0.15, threshold));
    } catch (error) {
      console.error("Error calculating dynamic threshold:", error);
      return 0.05; // Safe fallback
    }
  }

  /**
   * Fuse results from multiple vector searches using intelligent weighted scoring
   */
  async fuseMultiVectorResults(searches, weights, limit) {
    const scoreMap = new Map();

    // Combine scores from all vectors (3 text + 1 visual)
    searches.forEach((searchResults, index) => {
      const vectorNames = [
        "primary_search",
        "semantic_desc",
        "object_focus",
        "visual_features",
      ];
      const vectorName = vectorNames[index];
      const weight = weights[vectorName] || 1.0;

      searchResults.forEach((result) => {
        const id = result.id;
        const currentScore = scoreMap.get(id) || {
          maxScore: 0,
          totalScore: 0,
          payload: result.payload,
          id: result.id,
          vectorScores: {},
          vectorCount: 0,
        };

        // Store individual vector scores
        currentScore.vectorScores[vectorName] = result.score;
        currentScore.vectorCount++;

        // Track the highest single vector score
        const weightedScore = result.score * weight;
        currentScore.maxScore = Math.max(currentScore.maxScore, weightedScore);

        // Add weighted score from this vector
        currentScore.totalScore += weightedScore;
        scoreMap.set(id, currentScore);
      });
    });

    // Calculate intelligent final scores using hybrid approach
    const resultsWithIntelligentScoring = await Promise.all(
      Array.from(scoreMap.values()).map(async (result) => {
        // Hybrid scoring: 70% max score + 30% average score
        // This prevents low-quality multi-vector matches from outranking high-quality single-vector matches
        const averageScore = result.totalScore / result.vectorCount;
        const hybridScore = result.maxScore * 0.7 + averageScore * 0.3;

        // Apply room type relevance boost using AI semantic similarity
        const roomTypeBoost = await this.calculateRoomTypeRelevanceBoost(
          result.payload,
          this.currentSearchQuery
        );
        const finalScore = hybridScore * roomTypeBoost;

        return {
          ...result,
          score: finalScore,
          hybridScore: hybridScore,
          roomTypeBoost: roomTypeBoost,
          maxScore: result.maxScore,
          averageScore: averageScore,
          vectorBreakdown: result.vectorScores,
        };
      })
    );

    // Sort by final score and return top results
    const sortedResults = resultsWithIntelligentScoring
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    console.log(
      `🎯 Fused ${searches.length} vector searches into ${sortedResults.length} results`
    );

    // Debug: Log top results with their scores
    sortedResults.slice(0, 3).forEach((result, index) => {
      console.log(
        `🏆 Result ${index + 1}: ID ${result.id}, Room: ${
          result.payload?.room_type ||
          result.payload?.analysis?.ai_generated_tags?.room ||
          result.payload?.room ||
          "unknown"
        }, Score: ${result.score.toFixed(3)} (Max: ${result.maxScore.toFixed(
          3
        )}, Avg: ${result.averageScore.toFixed(
          3
        )}, Boost: ${result.roomTypeBoost.toFixed(2)})`
      );
    });

    return sortedResults;
  }

  /**
   * Production-ready reasoning generation with AI intent
   */
  generateProductionReasoning(weights, similarityScores, intentAnalysis) {
    const topVector = Object.entries(weights).reduce(
      (best, [name, weight]) =>
        weight > best.weight ? { name, weight } : best,
      { name: "primary_search", weight: 0 }
    );

    return `AI-powered multi-vector search with ${
      intentAnalysis.intent
    } intent (confidence: ${Math.round(
      intentAnalysis.confidence * 100
    )}%). Top vector: ${topVector.name} (weight: ${topVector.weight.toFixed(
      2
    )}). All vectors contribute with intelligent weighting based on AI-understood query characteristics.`;
  }

  /**
   * Calculate room type relevance boost using AI semantic similarity
   */
  async calculateRoomTypeRelevanceBoost(payload, query) {
    try {
      if (!query) return 1.0;

      // Extract room type from payload (handle different formats)
      const roomType =
        payload?.room_type ||
        payload?.analysis?.ai_generated_tags?.room ||
        payload?.room ||
        "";

      if (!roomType || roomType === "interior_space") {
        return 0.9; // Slight penalty for generic/missing room types
      }

      // Use AI to calculate semantic similarity between query and room type
      const similarity = await this.calculateSemanticRoomRelevance(
        query,
        roomType
      );

      // Apply EXTREME boost calculation to overcome poor vector embeddings
      // Perfect matches get massive boost, mismatches get severe penalties
      let boostFactor;
      if (similarity > 0.85) {
        // Perfect relevance rooms get extreme boost (4.0x to 8.0x)
        boostFactor = 4.0 + (similarity - 0.85) * 26.67; // Maps 0.85-1.0 to 4.0-8.0
      } else if (similarity > 0.7) {
        // Good relevance rooms get strong boost (2.5x to 4.0x)
        boostFactor = 2.5 + (similarity - 0.7) * 10.0; // Maps 0.7-0.85 to 2.5-4.0
      } else if (similarity > 0.5) {
        // Moderate relevance rooms get small boost (1.2x to 2.5x)
        boostFactor = 1.2 + (similarity - 0.5) * 6.5; // Maps 0.5-0.7 to 1.2-2.5
      } else {
        // Low relevance rooms get severe penalty (0.05x to 1.2x)
        boostFactor = 0.05 + similarity * 2.3; // Maps 0.0-0.5 to 0.05-1.2
      }

      return Math.min(8.0, Math.max(0.05, boostFactor));
    } catch (error) {
      console.error("Error calculating room type boost:", error);
      return 1.0; // Default no boost on error
    }
  }

  /**
   * Calculate semantic similarity between search query and room type using AI
   */
  async calculateSemanticRoomRelevance(query, roomType) {
    try {
      // Generate embeddings with better context for comparison - pure AI, no hardcoding
      const [queryEmbedding, roomEmbedding] = await Promise.all([
        getValidatedEmbedding(
          `searching for ${query.trim()}`,
          "room_relevance"
        ),
        getValidatedEmbedding(
          `this is a ${roomType.toLowerCase().trim()}`,
          "room_relevance"
        ),
      ]);

      // Calculate cosine similarity
      const similarity = this.calculateCosineSimilarity(
        queryEmbedding,
        roomEmbedding
      );

      return Math.max(0, Math.min(1, similarity)); // Clamp between 0-1
    } catch (error) {
      console.error("Error calculating semantic room relevance:", error);
      return 0.5; // Neutral similarity on error
    }
  }

  /**
   * Production-ready score analysis
   */
  calculateAverageScore(results) {
    if (results.length === 0) return 0;
    const totalScore = results.reduce((sum, result) => sum + result.score, 0);
    return totalScore / results.length;
  }

  analyzeScoreDistribution(results) {
    if (results.length === 0) return { high: 0, medium: 0, low: 0 };

    const distribution = { high: 0, medium: 0, low: 0 };
    results.forEach((result) => {
      if (result.score >= 0.8) distribution.high++;
      else if (result.score >= 0.7) distribution.medium++;
      else distribution.low++;
    });

    return distribution;
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  calculateCosineSimilarity(embedding1, embedding2) {
    try {
      if (
        !embedding1 ||
        !embedding2 ||
        embedding1.length !== embedding2.length
      ) {
        return 0;
      }

      let dotProduct = 0;
      let norm1 = 0;
      let norm2 = 0;

      for (let i = 0; i < embedding1.length; i++) {
        dotProduct += embedding1[i] * embedding2[i];
        norm1 += embedding1[i] * embedding1[i];
        norm2 += embedding2[i] * embedding2[i];
      }

      const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
      return Math.max(0, Math.min(1, similarity)); // Clamp between 0 and 1
    } catch (error) {
      console.error("Error calculating cosine similarity:", error);
      return 0;
    }
  }

  /**
   * Generate reasoning based on AI similarity scores
   */
  generateAISelectionReasoning(scores, selected, purposes) {
    // Sort vectors by score for better reasoning
    const sortedScores = Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score]) => ({ name, score }));

    const topScore = sortedScores[0];
    const secondScore = sortedScores[1];

    const reasoning = `AI selected ${
      selected.name
    } vector because it has the highest semantic similarity (${Math.round(
      selected.score * 100
    )}%) to the query intent. `;
    const purpose = purposes[selected.name];

    if (secondScore && topScore.score - secondScore.score < 0.1) {
      return (
        reasoning +
        `This vector specializes in: ${purpose}. Note: ${
          secondScore.name
        } was very close (${Math.round(secondScore.score * 100)}%).`
      );
    }

    return reasoning + `This vector specializes in: ${purpose}.`;
  }

  /**
   * Get vector description
   */
  getVectorDescription(vectorName) {
    const descriptions = {
      primary_search:
        "General search vector for room types, objects, and overall concepts",
      semantic_desc:
        "Semantic understanding vector for styles, themes, and descriptions",
      object_focus: "Object-specific vector for furniture, fixtures, and items",
      visual_features:
        "Visual attributes vector for colors, materials, and aesthetics",
    };
    return descriptions[vectorName] || "Unknown vector type";
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
        search_count: result.searchCount || 1,
        vector_matches: result.vectorMatches || [],
        vectorBreakdown: result.vectorBreakdown, // Preserve vector breakdown from fusion

        // Preserve enhanced scoring data from fusion algorithm
        hybridScore: result.hybridScore,
        roomTypeBoost: result.roomTypeBoost,
        maxScore: result.maxScore,
        averageScore: result.averageScore,

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
}

export default new ImageService();

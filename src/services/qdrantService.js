import { QdrantClient } from "@qdrant/js-client-rest";
import embeddingService from "./embeddingService.js"; // Static import to fix the error
import dotenv from "dotenv";

dotenv.config();

class QdrantService {
  constructor() {
    const config = {
      url: process.env.QDRANT_URL || "http://localhost:6333",
    };

    // Only add apiKey if it's set and not a placeholder
    if (
      process.env.QDRANT_API_KEY &&
      process.env.QDRANT_API_KEY !== "your_qdrant_api_key"
    ) {
      config.apiKey = process.env.QDRANT_API_KEY;
    }

    this.client = new QdrantClient(config);
    this.collectionName = "interior_images_description";
  }

  async createCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === this.collectionName
      );

      if (collectionExists) {
        // Check if existing collection has correct dimensions
        const collectionInfo = await this.client.getCollection(
          this.collectionName
        );
        const vectors = collectionInfo.config.params.vectors;

        // Check if collection has the new mixed dimensions structure
        const hasVisualFeatures =
          vectors.visual_features && vectors.visual_features.size === 384;
        const hasTextEmbeddings =
          vectors.primary_search && vectors.primary_search.size === 384;

        if (!hasVisualFeatures || !hasTextEmbeddings) {
          console.log(
            `⚠️ Collection '${this.collectionName}' exists but needs mixed dimensions. Deleting and recreating...`
          );
          await this.client.deleteCollection(this.collectionName);
        } else {
          console.log(
            `Collection '${this.collectionName}' already exists with mixed dimensions (CNN: 384d, ANN: 384d)`
          );
          return;
        }
      }

      // Create collection with mixed dimensions: CNN (768d) + ANN (384d)
      await this.client.createCollection(this.collectionName, {
        vectors: {
          // CNN-based visual features (384 dimensions)
          visual_features: {
            size: 384, // Compatible with fallback approach
            distance: "Cosine",
          },
          // ANN-based text embeddings (384 dimensions)
          object_focus: {
            size: 384, // all-MiniLM-L6-v2 dimension
            distance: "Cosine",
          },
          primary_search: {
            size: 384, // all-MiniLM-L6-v2 dimension
            distance: "Cosine",
          },
          semantic_desc: {
            size: 384, // all-MiniLM-L6-v2 dimension
            distance: "Cosine",
          },
        },
        optimizers_config: {
          default_segment_number: 2,
        },
        replication_factor: 1,
      });

      // Create payload indexes for fast filtering
      try {
        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "room_type",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "design_theme",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "budget_category",
          field_schema: "keyword",
        });

        await this.client.createPayloadIndex(this.collectionName, {
          field_name: "space_type",
          field_schema: "keyword",
        });
      } catch (indexError) {
        console.log("Some indexes may already exist, continuing...");
      }

      console.log(`✅ Collection '${this.collectionName}' created successfully with mixed dimensions:
        • Visual Features: 384d (CNN)
        • Text Embeddings: 384d (ANN)`);
    } catch (error) {
      console.error("Error creating collection:", error);
      throw error;
    }
  }

  async healthCheck() {
    try {
      await this.client.getCollections();
      console.log("✅ Qdrant connection is healthy");
    } catch (error) {
      console.error("❌ Qdrant connection failed:", error.message);
      throw new Error(`Qdrant connection failed: ${error.message}`);
    }
  }

  async upsertPoints(points) {
    try {
      // Validate dimensions for all points before upserting
      console.log(
        `🔍 Validating ${points.length} points for 384-dimensional vectors...`
      );
      for (let i = 0; i < points.length; i++) {
        try {
          this.validatePointDimensions(points[i]);
        } catch (error) {
          throw new Error(`Point ${i} (ID: ${points[i].id}): ${error.message}`);
        }
      }
      console.log(`✅ All points validated with correct 384 dimensions`);

      // Batch upserts for better performance
      const batchSize = 100;
      const batches = [];

      for (let i = 0; i < points.length; i += batchSize) {
        batches.push(points.slice(i, i + batchSize));
      }

      let totalUpserted = 0;
      for (const batch of batches) {
        const response = await this.client.upsert(this.collectionName, {
          wait: true,
          points: batch,
        });
        totalUpserted += batch.length;
        console.log(
          `📥 Upserted batch: ${batch.length} points (${totalUpserted}/${points.length} total)`
        );
      }

      console.log(
        `✅ Successfully upserted ${points.length} points to local embedding collection (384 dimensions)`
      );
      return { operation_id: "batch_complete", status: "completed" };
    } catch (error) {
      console.error("Error upserting points:", error);
      throw error;
    }
  }

  // Fixed: Use static import instead of dynamic import to resolve the error
  async getEmbedding(
    text,
    taskDescription = "Generate semantic embeddings for interior design search"
  ) {
    try {
      const embedding = await embeddingService.getEmbedding(
        text,
        taskDescription
      );

      // Validate embedding dimensions
      if (!Array.isArray(embedding) || embedding.length !== 384) {
        throw new Error(
          `Invalid embedding dimensions: expected 384, got ${
            embedding?.length || "undefined"
          }`
        );
      }

      return embedding;
    } catch (error) {
      console.error("Error generating embedding:", error);
      throw new Error(`Failed to generate embedding: ${error.message}`);
    }
  }

  /**
   * Validate that all vectors in a point have correct dimensions (ALL vectors: 384d)
   */
  validatePointDimensions(point) {
    const expectedDimensions = {
      // ALL vectors must be 384d for consistency
      visual_features: 384, // ResNet CNN features (smart 384d)
      primary_search: 384, // Text embeddings (384d)
      semantic_desc: 384, // Cultural context (384d)
      object_focus: 384, // Object features (384d)
    };

    console.log(
      `🔍 Validating point ${point.id} with vectors:`,
      Object.keys(point.vectors || {})
    );

    for (const [field, expectedDimension] of Object.entries(
      expectedDimensions
    )) {
      if (point.vectors && point.vectors[field]) {
        const vector = point.vectors[field];

        // Validate vector structure
        if (!Array.isArray(vector)) {
          throw new Error(
            `Invalid ${field} vector structure: expected array, got ${typeof vector} for image ${
              point.id
            }`
          );
        }

        // Validate vector dimensions
        if (vector.length !== expectedDimension) {
          throw new Error(
            `Invalid ${field} vector dimensions: expected ${expectedDimension}, got ${vector.length} for image ${point.id}`
          );
        }

        // Validate vector values
        if (vector.some((val) => !isFinite(val))) {
          throw new Error(
            `Invalid ${field} vector values: contains non-finite values for image ${point.id}`
          );
        }

        // Check for all-zero vectors (potential issue)
        const allZeros = vector.every((val) => val === 0);
        if (allZeros) {
          console.warn(
            `⚠️ Warning: ${field} vector is all zeros for image ${point.id}`
          );
        }

        console.log(`✅ ${field}: ${vector.length}d vector validated`);
      } else {
        throw new Error(
          `Missing required vector: ${field} for image ${point.id}`
        );
      }
    }

    console.log(`✅ All vectors validated for point ${point.id}`);
  }

  async search(
    query,
    limit = 100,
    filters = {},
    weights = { primary_search: 0.4, semantic_desc: 0.35, object_focus: 0.25 }
  ) {
    try {
      let enhancedQuery;
      let useEnhancement = false; // Simplified for now

      // For now, use simple query enhancement
      if (typeof query === "string") {
        enhancedQuery = {
          enhanced_query: {
            primary_search: `Interior design search: ${query}`,
            semantic_desc: `Interior design style and context: ${query}`,
            object_focus: `Furniture and objects: ${query}`,
            intent: "general",
          },
        };
      } else {
        enhancedQuery = query;
      }

      console.log(`🔍 Searching for: "${query}" with enhanced queries`);

      // Generate embeddings for all three query types
      const [primarySearchVector, semanticDescVector, objectFocusVector] =
        await Promise.all([
          this.getEmbedding(
            enhancedQuery.enhanced_query?.primary_search || query,
            "Interior design room search"
          ),
          this.getEmbedding(
            enhancedQuery.enhanced_query?.semantic_desc || query,
            "Interior design style search"
          ),
          this.getEmbedding(
            enhancedQuery.enhanced_query?.object_focus || query,
            "Furniture and object search"
          ),
        ]);

      // Perform searches on all three vectors
      const [primaryResults, semanticResults, objectResults] =
        await Promise.all([
          this.client.search(this.collectionName, {
            vector: { name: "primary_search", vector: primarySearchVector },
            limit: limit * 2,
            with_payload: true,
            with_vector: false,
            filter:
              Object.keys(filters).length > 0
                ? this.buildFilter(filters)
                : undefined,
            score_threshold: 0.3, // Minimum similarity threshold
          }),
          this.client.search(this.collectionName, {
            vector: { name: "semantic_desc", vector: semanticDescVector },
            limit: limit * 2,
            with_payload: true,
            with_vector: false,
            filter:
              Object.keys(filters).length > 0
                ? this.buildFilter(filters)
                : undefined,
            score_threshold: 0.3,
          }),
          this.client.search(this.collectionName, {
            vector: { name: "object_focus", vector: objectFocusVector },
            limit: limit * 2,
            with_payload: true,
            with_vector: false,
            filter:
              Object.keys(filters).length > 0
                ? this.buildFilter(filters)
                : undefined,
            score_threshold: 0.3,
          }),
        ]);

      console.log(
        `📊 Search results: Primary: ${primaryResults.length}, Semantic: ${semanticResults.length}, Object: ${objectResults.length}`
      );

      // Fusion scoring: combine results from all vectors
      const fusedResults = this.fuseSearchResults(
        [
          { results: primaryResults, weight: weights.primary_search },
          { results: semanticResults, weight: weights.semantic_desc },
          { results: objectResults, weight: weights.object_focus },
        ],
        limit
      );

      return {
        results: fusedResults,
        search_metadata: {
          original_query: typeof query === "string" ? query : "enhanced_query",
          enhanced_query: enhancedQuery,
          weights_used: weights,
          vectors_searched: ["primary_search", "semantic_desc", "object_focus"],
          enhancement_used: useEnhancement,
          total_found: fusedResults.length,
        },
      };
    } catch (error) {
      console.error("Error in search:", error);
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  // Multi-vector search method (alternative to main search)
  async multiVectorSearch(
    queryEmbeddings,
    limit = 100,
    filter = null,
    weights = { primary_search: 0.4, semantic_desc: 0.3, object_focus: 0.3 }
  ) {
    try {
      const searches = await Promise.all([
        this.client.search(this.collectionName, {
          vector: {
            name: "primary_search",
            vector: queryEmbeddings.primary_search,
          },
          limit: limit,
          with_payload: true,
          with_vector: false,
          filter: filter,
        }),
        this.client.search(this.collectionName, {
          vector: {
            name: "semantic_desc",
            vector: queryEmbeddings.semantic_desc,
          },
          limit: limit,
          with_payload: true,
          with_vector: false,
          filter: filter,
        }),
        this.client.search(this.collectionName, {
          vector: {
            name: "object_focus",
            vector: queryEmbeddings.object_focus,
          },
          limit: limit,
          with_payload: true,
          with_vector: false,
          filter: filter,
        }),
      ]);

      // Combine and weight results
      const combinedResults = new Map();

      searches.forEach((results, index) => {
        const vectorNames = ["primary_search", "semantic_desc", "object_focus"];
        const weight = weights[vectorNames[index]];

        results.forEach((result) => {
          const existing = combinedResults.get(result.id) || {
            ...result,
            combined_score: 0,
          };
          existing.combined_score += result.score * weight;
          combinedResults.set(result.id, existing);
        });
      });

      const sortedResults = Array.from(combinedResults.values())
        .sort((a, b) => b.combined_score - a.combined_score)
        .slice(0, limit);

      console.log(
        `🎯 Multi-vector search completed: ${sortedResults.length} combined results`
      );
      return sortedResults;
    } catch (error) {
      console.error("Error in multi-vector search:", error);
      throw error;
    }
  }

  /**
   * Fuse results from multiple vector searches using weighted scoring
   */
  fuseSearchResults(searchResults, limit) {
    const scoreMap = new Map();

    // Combine scores from all vectors
    searchResults.forEach(({ results, weight }) => {
      results.forEach((result) => {
        const id = result.id;
        const currentScore = scoreMap.get(id) || {
          totalScore: 0,
          payload: result.payload,
          id: result.id,
        };

        // Add weighted score
        const normalizedScore = result.score * weight;
        currentScore.totalScore += normalizedScore;
        scoreMap.set(id, currentScore);
      });
    });

    // Sort by total score and return top results
    const sortedResults = Array.from(scoreMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map((result) => ({
        id: result.id,
        payload: result.payload,
        score: result.totalScore,
      }));

    return sortedResults;
  }

  buildFilter(filters) {
    const must = [];

    Object.entries(filters).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        must.push({
          key: key,
          match: { any: value },
        });
      } else {
        must.push({
          key: key,
          match: { value: value },
        });
      }
    });

    return { must };
  }

  /**
   * Get a specific point by ID
   */
  async getPointById(pointId) {
    try {
      const response = await this.client.retrieve(this.collectionName, {
        ids: [pointId],
        with_payload: true,
        with_vector: false,
      });

      return response.length > 0 ? response[0] : null;
    } catch (error) {
      console.error("Error retrieving point by ID:", error);
      return null;
    }
  }

  /**
   * Get collection info
   */
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      console.log(`📊 Collection '${this.collectionName}' info:`, {
        points_count: info.points_count,
        vectors_count: info.vectors_count,
        status: info.status,
      });
      return info;
    } catch (error) {
      console.error("Error getting collection info:", error);
      throw error;
    }
  }

  /**
   * Delete collection (for cleanup/reset)
   */
  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`🗑️ Collection '${this.collectionName}' deleted`);
    } catch (error) {
      console.error("Error deleting collection:", error);
      throw error;
    }
  }

  /**
   * Force recreate collection with correct dimensions
   */
  async recreateCollection() {
    try {
      console.log(
        `🔄 Force recreating collection '${this.collectionName}' with correct dimensions...`
      );

      // Delete existing collection if it exists
      try {
        await this.client.deleteCollection(this.collectionName);
        console.log(`🗑️ Deleted existing collection '${this.collectionName}'`);
      } catch (error) {
        // Collection might not exist, that's fine
        console.log(
          `ℹ️ Collection '${this.collectionName}' doesn't exist, creating new one`
        );
      }

      // Create new collection with correct dimensions
      await this.createCollection();
      console.log(
        `✅ Collection '${this.collectionName}' recreated successfully`
      );
    } catch (error) {
      console.error("Error recreating collection:", error);
      throw error;
    }
  }

  /**
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions() {
    try {
      const response = await this.client.scroll(this.collectionName, {
        limit: 100,
        with_payload: true,
        with_vector: false,
      });

      const suggestions = {
        room_types: new Set(),
        design_themes: new Set(),
        budget_categories: new Set(),
        space_types: new Set(),
      };

      response.points.forEach((point) => {
        if (point.payload.room_type)
          suggestions.room_types.add(point.payload.room_type);
        if (point.payload.design_theme)
          suggestions.design_themes.add(point.payload.design_theme);
        if (point.payload.budget_category)
          suggestions.budget_categories.add(point.payload.budget_category);
        if (point.payload.space_type)
          suggestions.space_types.add(point.payload.space_type);
      });

      return {
        room_types: Array.from(suggestions.room_types),
        design_themes: Array.from(suggestions.design_themes),
        budget_categories: Array.from(suggestions.budget_categories),
        space_types: Array.from(suggestions.space_types),
      };
    } catch (error) {
      console.error("Error getting search suggestions:", error);
      return {
        room_types: [],
        design_themes: [],
        budget_categories: [],
        space_types: [],
      };
    }
  }

  // NEW: Search by visual features (CNN - 768d)
  async searchByVisualFeatures(visualFeatures, limit = 100, filters = {}) {
    try {
      console.log(`🔍 Searching by visual features (384d)`);

      const results = await this.client.search(this.collectionName, {
        vector: { name: "visual_features", vector: visualFeatures },
        limit: limit,
        with_payload: true,
        with_vector: false,
        filter:
          Object.keys(filters).length > 0
            ? this.buildFilter(filters)
            : undefined,
        score_threshold: 0.3,
      });

      console.log(`✅ Visual search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error("Error in visual search:", error);
      throw error;
    }
  }

  // NEW: Search by text embeddings (ANN - 384d)
  async searchByTextEmbedding(textEmbedding, limit = 100, filters = {}) {
    try {
      console.log(`🔍 Searching by text embedding (384d)`);

      const results = await this.client.search(this.collectionName, {
        vector: { name: "primary_search", vector: textEmbedding },
        limit: limit,
        with_payload: true,
        with_vector: false,
        filter:
          Object.keys(filters).length > 0
            ? this.buildFilter(filters)
            : undefined,
        score_threshold: 0.3,
      });

      console.log(`✅ Text search found ${results.length} results`);
      return results;
    } catch (error) {
      console.error("Error in text search:", error);
      throw error;
    }
  }

  // NEW: Hybrid search combining visual and text
  async hybridSearch(query, searchType = "hybrid", limit = 100, filters = {}) {
    try {
      let results = [];

      switch (searchType) {
        case "visual":
          // Search by visual similarity (384d)
          const visualFeatures = await embeddingService.extractVisualFeatures(
            query
          );
          results = await this.searchByVisualFeatures(
            visualFeatures,
            limit,
            filters
          );
          break;

        case "text":
          // Search by text similarity (384d)
          const textEmbedding = await this.getEmbedding(
            query,
            "Interior design search"
          );
          results = await this.searchByTextEmbedding(
            textEmbedding,
            limit,
            filters
          );
          break;

        case "hybrid":
          // Combined visual + text search
          const [visualResults, textResults] = await Promise.all([
            this.hybridSearch(query, "visual", limit, filters),
            this.hybridSearch(query, "text", limit, filters),
          ]);
          results = this.mergeHybridResults(visualResults, textResults, limit);
          break;

        default:
          throw new Error(`Invalid search type: ${searchType}`);
      }

      return {
        results,
        search_type: searchType,
        total_found: results.length,
      };
    } catch (error) {
      console.error("Error in hybrid search:", error);
      throw error;
    }
  }

  // NEW: Merge results from visual and text searches
  mergeHybridResults(visualResults, textResults, limit) {
    // Ensure both are arrays
    const visualArray = Array.isArray(visualResults) ? visualResults : [];
    const textArray = Array.isArray(textResults) ? textResults : [];

    const combined = [...visualArray, ...textArray];
    const unique = new Map();

    combined.forEach((result) => {
      if (!unique.has(result.id)) {
        unique.set(result.id, {
          ...result,
          score: result.score || 0,
          sources: [],
        });
      }

      const existing = unique.get(result.id);
      existing.sources.push(result.searchType || "unknown");
      existing.score = Math.max(existing.score, result.score || 0);
    });

    return Array.from(unique.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * Perform exact search for precise text matches
   */
  async exactSearch(query, limit = 100, filters = {}) {
    try {
      console.log(`🔍 Performing exact search for: "${query}"`);

      // Get all points from the collection for exact matching
      const allPoints = await this.client.scroll(this.collectionName, {
        limit: 1000, // Get a reasonable number of points for exact matching
        with_payload: true,
        with_vector: false,
        filter:
          Object.keys(filters).length > 0
            ? this.buildFilter(filters)
            : undefined,
      });

      const exactMatches = [];
      const queryLower = query.toLowerCase();
      const queryWords = queryLower
        .split(/\s+/)
        .filter((word) => word.length > 0);

      for (const point of allPoints.points) {
        const payload = point.payload;
        const exactMatchScore = this.calculateExactMatchScore(
          payload,
          queryWords,
          queryLower
        );

        if (exactMatchScore > 0) {
          exactMatches.push({
            ...point,
            exactMatchScore,
            matchType: "exact",
          });
        }
      }

      // Sort by exact match score (highest first)
      exactMatches.sort((a, b) => b.exactMatchScore - a.exactMatchScore);

      console.log(`✅ Exact search found ${exactMatches.length} exact matches`);
      return exactMatches.slice(0, limit);
    } catch (error) {
      console.error("Error in exact search:", error);
      return [];
    }
  }

  /**
   * Calculate exact match score for a payload
   */
  calculateExactMatchScore(payload, queryWords, queryLower) {
    let score = 0;

    // Get all searchable text from payload
    const allText = this.getAllTextFromPayload(payload).toLowerCase();
    const allTextWords = allText.split(/\s+/);

    // Check for exact phrase match (highest weight)
    if (allText.includes(queryLower)) {
      score += 1.0;
    }

    // Check for exact word matches
    for (const queryWord of queryWords) {
      if (allTextWords.includes(queryWord)) {
        score += 0.8;
      }

      // Check for partial word matches
      if (
        allTextWords.some(
          (textWord) =>
            textWord.includes(queryWord) || queryWord.includes(textWord)
        )
      ) {
        score += 0.6;
      }
    }

    // Check for exact matches in priority fields
    const priorityFields = [
      payload.room_type,
      payload.design_theme,
      payload.space_type,
      ...(payload.tags?.primary_features || []),
      ...(payload.tags?.object_types || []),
      payload.ai_generated_tags?.room,
      payload.ai_generated_tags?.theme,
    ]
      .filter(Boolean)
      .map((field) => field.toLowerCase());

    for (const field of priorityFields) {
      if (field.includes(queryLower) || queryLower.includes(field)) {
        score += 0.9;
      }

      for (const queryWord of queryWords) {
        if (field.includes(queryWord) || queryWord.includes(field)) {
          score += 0.7;
        }
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * Get all text from payload for exact matching
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
}

export default new QdrantService();

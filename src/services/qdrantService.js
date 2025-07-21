import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY, // Optional for local setup
    });
    this.collectionName = "interior_images";
  }

  async createCollection() {
    try {
      // First check if collection already exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (col) => col.name === this.collectionName
      );

      if (collectionExists) {
        console.log(`Collection ${this.collectionName} already exists, skipping creation`);
        return;
      }

      await this.client.createCollection(this.collectionName, {
        vectors: {
          // Multi-vector configuration using OpenAI text-embedding-ada-002 (1536 dimensions)
          primary_search: {
            size: 1536,
            distance: "Cosine",
          },
          semantic_desc: {
            size: 1536,
            distance: "Cosine",
          },
          object_focus: {
            size: 1536,
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

      console.log(`Collection ${this.collectionName} created successfully`);
    } catch (error) {
      console.error("Error creating collection:", error);
      throw error;
    }
  }

  async upsertPoints(points) {
    try {
      await this.client.upsert(this.collectionName, {
        points: points,
      });
      console.log(`Successfully upserted ${points.length} points`);
    } catch (error) {
      console.error("Error upserting points:", error);
      throw error;
    }
  }

  async search(
    query,
    limit = 10,
    filters = {},
    weights = { primary_search: 0.4, semantic_desc: 0.35, object_focus: 0.25 }
  ) {
    try {
      let enhancedQuery;
      let useEnhancement = true;
      
      // Check if query is already enhanced or needs enhancement
      if (typeof query === 'string') {
        try {
          // Get AI-enhanced query using the new Search Intelligence Service
          const searchIntelligenceService = await import("../services/searchIntelligenceService.js");
          enhancedQuery = await searchIntelligenceService.default.enhanceSearchQuery(query);
          
          // Use dynamic weights from AI if available
          if (enhancedQuery.search_weights) {
            weights = enhancedQuery.search_weights;
          }
        } catch (enhancementError) {
          console.log("AI enhancement failed, falling back to simple search:", enhancementError.message);
          useEnhancement = false;
          enhancedQuery = {
            enhanced_query: {
              primary_search: query,
              semantic_desc: query,
              object_focus: query,
              intent: "general"
            }
          };
        }
      } else {
        enhancedQuery = query;
      }

      // Generate embeddings for all three query types
      const [primarySearchVector, semanticDescVector, objectFocusVector] = 
        await Promise.all([
          this.getEmbedding(enhancedQuery.enhanced_query?.primary_search || query),
          this.getEmbedding(enhancedQuery.enhanced_query?.semantic_desc || query),
          this.getEmbedding(enhancedQuery.enhanced_query?.object_focus || query),
        ]);

      // Perform searches on all three vectors
      const [primaryResults, semanticResults, objectResults] = await Promise.all([
        this.client.search(this.collectionName, {
          vector: { name: "primary_search", vector: primarySearchVector },
          limit: limit * 2, // Get more results for fusion
          with_payload: true,
          with_vector: false,
          filter: Object.keys(filters).length > 0 ? this.buildFilter(filters) : undefined,
        }),
        this.client.search(this.collectionName, {
          vector: { name: "semantic_desc", vector: semanticDescVector },
          limit: limit * 2,
          with_payload: true,
          with_vector: false,
          filter: Object.keys(filters).length > 0 ? this.buildFilter(filters) : undefined,
        }),
        this.client.search(this.collectionName, {
          vector: { name: "object_focus", vector: objectFocusVector },
          limit: limit * 2,
          with_payload: true,
          with_vector: false,
          filter: Object.keys(filters).length > 0 ? this.buildFilter(filters) : undefined,
        }),
      ]);

      // Fusion scoring: combine results from all vectors
      const fusedResults = this.fuseSearchResults(
        [
          { results: primaryResults, weight: weights.primary_search },
          { results: semanticResults, weight: weights.semantic_desc },
          { results: objectResults, weight: weights.object_focus },
        ],
        limit
      );

      // Add enhancement metadata to results
      return {
        results: fusedResults,
        search_metadata: {
          original_query: typeof query === 'string' ? query : 'enhanced_query',
          enhanced_query: useEnhancement ? enhancedQuery : null,
          weights_used: weights,
          vectors_searched: ['primary_search', 'semantic_desc', 'object_focus'],
          enhancement_used: useEnhancement
        }
      };
    } catch (error) {
      console.error("Error in search:", error);
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
      results.forEach((result, index) => {
        const id = result.id;
        const currentScore = scoreMap.get(id) || { 
          totalScore: 0, 
          payload: result.payload,
          id: result.id 
        };
        
        // Add weighted score (higher rank = lower index = higher score)
        const normalizedScore = result.score * weight;
        currentScore.totalScore += normalizedScore;
        scoreMap.set(id, currentScore);
      });
    });

    // Sort by total score and return top results
    const sortedResults = Array.from(scoreMap.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, limit)
      .map(result => ({
        id: result.id,
        payload: result.payload,
        score: result.totalScore
      }));

    return sortedResults;
  }

  async getEmbedding(text) {
    // Import embedding service dynamically to avoid circular dependency
    const { default: embeddingService } = await import(
      "../services/embeddingService.js"
    );
    return await embeddingService.getEmbedding(text);
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
   * Get search suggestions for autocomplete
   */
  async getSearchSuggestions() {
    try {
      // Get a sample of points to extract unique values
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
}

export default new QdrantService();

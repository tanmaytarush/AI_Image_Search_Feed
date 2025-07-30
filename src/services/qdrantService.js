import { QdrantClient } from "@qdrant/js-client-rest";
import dotenv from "dotenv";

dotenv.config();

class QdrantService {
  constructor() {
    this.client = new QdrantClient({
      url: process.env.QDRANT_URL || "http://localhost:6333",
      apiKey: process.env.QDRANT_API_KEY,
    });
    this.collectionName = "interior_images_local";
  }

  async createCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const collectionExists = collections.collections.some(
        (collection) => collection.name === this.collectionName
      );

      if (collectionExists) {
        console.log(`Collection '${this.collectionName}' already exists`);
        return;
      }

      // Create collection with local Transformers.js dimensions (384)
      await this.client.createCollection(this.collectionName, {
        vectors: {
          object_focus: {
            size: 384,  // all-MiniLM-L6-v2 dimension
            distance: "Cosine"
          },
          primary_search: {
            size: 384,  // all-MiniLM-L6-v2 dimension
            distance: "Cosine"
          },
          semantic_desc: {
            size: 384,  // all-MiniLM-L6-v2 dimension
            distance: "Cosine"
          }
        },
        optimizers_config: {
          default_segment_number: 2
        },
        replication_factor: 1
      });

      console.log(`✅ Collection '${this.collectionName}' created successfully with local embeddings (384 dimensions)`);
    } catch (error) {
      console.error("Error creating collection:", error);
      throw error;
    }
  }

  async upsertPoints(points) {
    try {
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
        console.log(`📥 Upserted batch: ${batch.length} points (${totalUpserted}/${points.length} total)`);
      }

      console.log(`✅ Successfully upserted ${points.length} points to local embedding collection`);
      return { operation_id: "batch_complete", status: "completed" };
    } catch (error) {
      console.error("Error upserting points:", error);
      throw error;
    }
  }

  // Search using specific vector type
  async search(queryEmbedding, vectorName = "primary_search", limit = 10, filter = null) {
    try {
      const searchParams = {
        vector: {
          name: vectorName,
          vector: queryEmbedding
        },
        limit: limit,
        with_payload: true,
        with_vector: false,
        score_threshold: 0.5 // Minimum similarity threshold
      };

      if (filter) {
        searchParams.filter = filter;
      }

      const results = await this.client.search(this.collectionName, searchParams);
      
      console.log(`🔍 Search completed: ${results.length} results found using ${vectorName} vector`);
      return results;
    } catch (error) {
      console.error("Error searching:", error);
      throw error;
    }
  }

  // Search across multiple vector types and combine results
  async multiVectorSearch(queryEmbedding, limit = 10, filter = null, weights = { primary_search: 0.4, semantic_desc: 0.3, object_focus: 0.3 }) {
    try {
      const searches = await Promise.all([
        this.search(queryEmbedding.primary_search, "primary_search", limit, filter),
        this.search(queryEmbedding.semantic_desc, "semantic_desc", limit, filter),
        this.search(queryEmbedding.object_focus, "object_focus", limit, filter)
      ]);

      // Combine and weight results
      const combinedResults = new Map();
      
      searches.forEach((results, index) => {
        const vectorNames = ["primary_search", "semantic_desc", "object_focus"];
        const weight = weights[vectorNames[index]];
        
        results.forEach(result => {
          const existing = combinedResults.get(result.id) || { ...result, combined_score: 0 };
          existing.combined_score += result.score * weight;
          combinedResults.set(result.id, existing);
        });
      });

      // Sort by combined score and return top results
      const sortedResults = Array.from(combinedResults.values())
        .sort((a, b) => b.combined_score - a.combined_score)
        .slice(0, limit);

      console.log(`🎯 Multi-vector search completed: ${sortedResults.length} combined results`);
      return sortedResults;
    } catch (error) {
      console.error("Error in multi-vector search:", error);
      throw error;
    }
  }

  // Get collection info
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      console.log(`📊 Collection '${this.collectionName}' info:`, {
        points_count: info.points_count,
        vectors_count: info.vectors_count,
        status: info.status
      });
      return info;
    } catch (error) {
      console.error("Error getting collection info:", error);
      throw error;
    }
  }

  // Delete collection (for cleanup/reset)
  async deleteCollection() {
    try {
      await this.client.deleteCollection(this.collectionName);
      console.log(`🗑️ Collection '${this.collectionName}' deleted`);
    } catch (error) {
      console.error("Error deleting collection:", error);
      throw error;
    }
  }
}

export default new QdrantService();

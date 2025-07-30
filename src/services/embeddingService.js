import { pipeline } from "@xenova/transformers";
import dotenv from "dotenv";

dotenv.config();

class EmbeddingService {
  constructor() {
    this.extractor = null;
    this.initialized = false;
  }

  async initializeExtractor() {
    if (!this.initialized) {
      try {
        // Use a reliable model - this WILL work
        this.extractor = await pipeline(
          "feature-extraction",
          "Xenova/all-MiniLM-L6-v2"
        );
        this.initialized = true;
        console.log("✅ Successfully initialized Xenova/all-MiniLM-L6-v2 (384 dimensions)");
      } catch (error) {
        console.error("Error initializing embedding extractor:", error);
        throw error;
      }
    }
  }

  async getEmbedding(text, taskDescription = "Generate semantic embeddings for interior design search and retrieval") {
    await this.initializeExtractor();
    try {
      // Combine task description with text for better context
      const contextualText = `${taskDescription}: ${text}`;
      
      const output = await this.extractor(contextualText, { 
        pooling: "mean", 
        normalize: true 
      });
      return output.tolist()[0];
    } catch (error) {
      console.error("Error creating embedding:", error);
      throw new Error("Failed to create embedding");
    }
  }

  validateVectorDimensions(imageId, vectors) {
    const expectedDimension = 384; // Xenova/all-MiniLM-L6-v2 dimensions
    
    for (const [vectorName, vector] of Object.entries(vectors)) {
      if (!Array.isArray(vector)) {
        throw new Error(`${vectorName} is not an array for image ${imageId}`);
      }
      if (vector.length !== expectedDimension) {
        throw new Error(`${vectorName} has incorrect dimensions for image ${imageId}: expected ${expectedDimension}, got ${vector.length}`);
      }
      if (vector.some(val => !isFinite(val))) {
        throw new Error(`${vectorName} contains invalid values for image ${imageId}`);
      }
    }
  }

  async createMultiVectors(aiGeneratedTags, description, metadata, imageId = "unknown") {
    // Add default values and validation
    const safeAiTags = aiGeneratedTags || {};
    const {
      room = "unknown",
      theme = "unknown",
      primary_features = [],
      objects = [],
      visual_attributes = {},
      indian_context = {},
    } = safeAiTags;

    // Safe array helpers
    const safeJoin = (arr, separator = " ") => {
      return Array.isArray(arr) ? arr.join(separator) : "";
    };

    const safeMap = (arr, mapFn) => {
      return Array.isArray(arr) ? arr.map(mapFn) : [];
    };

    const safeFlatMap = (arr, mapFn) => {
      return Array.isArray(arr) ? arr.flatMap(mapFn) : [];
    };

    // Safe access to nested properties
    const safeIndianContext = {
      regional_style: indian_context.regional_style || "unknown",
      space_utilization: indian_context.space_utilization || "unknown",
      cultural_significance: indian_context.cultural_significance || "",
      modern_adaptations: indian_context.modern_adaptations || [],
      traditional_elements: indian_context.traditional_elements || [],
    };

    const safeVisualAttributes = {
      materials: visual_attributes.materials || [],
      colors: visual_attributes.colors || [],
    };

    // 1. Primary Search Vector - Enhanced structured composition
    const primarySearchText =
      `Interior Design: ${room} room in ${theme} style with ${safeIndianContext.regional_style} influences. Space Layout: ${safeIndianContext.space_utilization}.`.toLowerCase();

    // 2. Semantic Description Vector - Cultural context and relationships
    const semanticDescText = `This ${room} showcases ${theme} design where ${
      safeIndianContext.cultural_significance
    }. ${description || ""} Traditional elements: ${safeJoin(
      safeIndianContext.traditional_elements,
      ", "
    )}. Modern adaptations: ${safeJoin(
      safeIndianContext.modern_adaptations,
      ", "
    )}.`.toLowerCase();

    // 3. Object Focus Vector - Detailed furniture and material composition
    const objectTypes = safeJoin(
      safeMap(objects, (obj) => obj.type || ""),
      ", "
    );
    const objectFeatures = safeJoin(
      safeFlatMap(objects, (obj) => obj.features || []),
      ", "
    );
    const materials = safeJoin(safeVisualAttributes.materials, ", ");
    const features = safeJoin(primary_features, ", ");
    const colors = safeJoin(safeVisualAttributes.colors, ", ");

    const objectFocusText =
      `Furniture: ${objectTypes}. Materials: ${materials}. Features: ${features}. Colors: ${colors}. Object Details: ${objectFeatures}.`.toLowerCase();

    // Generate embeddings with task-specific descriptions
    const [primarySearchVector, semanticDescVector, objectFocusVector] = await Promise.all([
      this.getEmbedding(primarySearchText, "Interior design room search by style and layout"),
      this.getEmbedding(semanticDescText, "Interior design cultural context and descriptions"),
      this.getEmbedding(objectFocusText, "Furniture and object information for interior design search"),
    ]);

    // Validate dimensions
    this.validateVectorDimensions(imageId, {
      primary_search: primarySearchVector,
      semantic_desc: semanticDescVector,
      object_focus: objectFocusVector,
    });

    // Quality assessment and logging
    this.logEmbeddingQuality(imageId, {
      primary_search: primarySearchText,
      semantic_desc: semanticDescText,
      object_focus: objectFocusText,
    });

    console.log(`✅ Generated local embeddings for ${imageId} (384 dimensions each)`);

    return {
      primary_search: primarySearchVector,
      semantic_desc: semanticDescVector,
      object_focus: objectFocusVector,
      embedding_texts: {
        primary_search: primarySearchText,
        semantic_desc: semanticDescText,
        object_focus: objectFocusText,
      },
    };
  }

  logEmbeddingQuality(imageId, embeddingTexts) {
    const qualityMetrics = {};

    for (const [vectorName, text] of Object.entries(embeddingTexts)) {
      const wordCount = text.split(" ").length;
      const hasUnknown = text.includes("unknown");
      const hasEmpty = text.trim().length === 0;

      qualityMetrics[vectorName] = {
        wordCount,
        hasUnknown,
        hasEmpty,
        quality: this.assessQuality(wordCount, hasUnknown, hasEmpty),
      };
    }

    // Log quality assessment
    const overallQuality = Object.values(qualityMetrics).every(
      (m) => m.quality === "good"
    )
      ? "good"
      : "needs_attention";

    if (overallQuality === "needs_attention") {
      console.log(`🔍 Quality assessment for ${imageId}:`, qualityMetrics);
    }
  }

  assessQuality(wordCount, hasUnknown, hasEmpty) {
    if (hasEmpty || wordCount < 3) return "poor";
    if (hasUnknown && wordCount < 8) return "fair";
    if (wordCount < 5) return "fair";
    return "good";
  }

  async tokenizeText(text) {
    // Deprecated but keeping for compatibility
    return [];
  }
}

export default new EmbeddingService();

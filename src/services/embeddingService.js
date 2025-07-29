import OpenAI from "openai";
import { AutoTokenizer } from "@xenova/transformers";
import dotenv from "dotenv";

dotenv.config();

class EmbeddingService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.tokenizer = null;
    this.initializeTokenizer();
  }

  async initializeTokenizer() {
    try {
      this.tokenizer = await AutoTokenizer.from_pretrained(
        "Xenova/all-MiniLM-L6-v2"
      );
    } catch (error) {
      console.error("Error initializing tokenizer:", error);
    }
  }

  async createMultiVectors(
    aiGeneratedTags,
    description,
    metadata,
    imageId = "unknown"
  ) {
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

    // 1. Primary Search Vector - Enhanced structured composition for better semantic understanding
    const primarySearchText =
      `Interior Design: ${room} room in ${theme} style with ${safeIndianContext.regional_style} influences. Space Layout: ${safeIndianContext.space_utilization}.`.toLowerCase();

    // 2. Semantic Description Vector - Contextual relationships and cultural significance
    const semanticDescText = `This ${room} showcases ${theme} design where ${
      safeIndianContext.cultural_significance
    }. ${description || ""} ${safeJoin(
      safeIndianContext.modern_adaptations,
      ", "
    )}.`.toLowerCase();

    // 3. Object Focus Vector - Structured composition with clear categories
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

    // Generate all three embeddings
    const [primarySearchVector, semanticDescVector, objectFocusVector] =
      await Promise.all([
        this.getEmbedding(primarySearchText),
        this.getEmbedding(semanticDescText),
        this.getEmbedding(objectFocusText),
      ]);

    // Quality assessment and logging
    this.logEmbeddingQuality(imageId, {
      primary_search: primarySearchText,
      semantic_desc: semanticDescText,
      object_focus: objectFocusText,
    });

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

  async getEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error creating embedding:", error);
      throw new Error("Failed to create embedding");
    }
  }

  async tokenizeText(text) {
    if (!this.tokenizer) {
      await this.initializeTokenizer();
    }

    try {
      const tokens = this.tokenizer.encode(text);
      return tokens;
    } catch (error) {
      console.error("Error tokenizing text:", error);
      throw new Error("Failed to tokenize text");
    }
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
}

export default new EmbeddingService();

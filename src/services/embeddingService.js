<<<<<<< HEAD
import { pipeline } from "@xenova/transformers";
=======
import OpenAI from "openai";
import { AutoTokenizer } from '@xenova/transformers';
>>>>>>> origin/main
import dotenv from "dotenv";

dotenv.config();

class EmbeddingService {
  constructor() {
<<<<<<< HEAD
    this.extractor = null;
    this.initialized = false;
  }

  async initializeExtractor() {
    if (!this.initialized) {
      try {
        this.extractor = await pipeline(
          "feature-extraction",
          "sangmini/msmarco-cotmae-MiniLM-L12_en-ko-ja"
        );
        this.initialized = true;
      } catch (error) {
        console.error("Error initializing HuggingFace extractor:", error);
      }
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
=======
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.tokenizer = null;
    this.initializeTokenizer();
  }

  async initializeTokenizer() {
    try {
      this.tokenizer = await AutoTokenizer.from_pretrained('Xenova/all-MiniLM-L6-v2');
    } catch (error) {
      console.error("Error initializing tokenizer:", error);
    }
  }

  async createMultiVectors(aiGeneratedTags, description, metadata) {
    // Add default values and validation
    const safeAiTags = aiGeneratedTags || {};
    const {
      room = 'unknown',
      theme = 'unknown', 
>>>>>>> origin/main
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
<<<<<<< HEAD
      regional_style: indian_context.regional_style || "unknown",
      space_utilization: indian_context.space_utilization || "unknown",
      cultural_significance: indian_context.cultural_significance || "",
      modern_adaptations: indian_context.modern_adaptations || [],
      traditional_elements: indian_context.traditional_elements || [],
=======
      regional_style: indian_context.regional_style || 'unknown',
      space_utilization: indian_context.space_utilization || 'unknown',
      cultural_significance: indian_context.cultural_significance || '',
      modern_adaptations: indian_context.modern_adaptations || [],
      traditional_elements: indian_context.traditional_elements || []
>>>>>>> origin/main
    };

    const safeVisualAttributes = {
      materials: visual_attributes.materials || [],
<<<<<<< HEAD
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
=======
      colors: visual_attributes.colors || []
    };

    // 1. Primary Search Vector - Room, Theme, Regional Style
    const primarySearchText =
      `${room} ${theme} ${safeIndianContext.regional_style} ${safeIndianContext.space_utilization}`.toLowerCase();

    // 2. Semantic Description Vector - Detailed description and cultural context
    const semanticDescText = `${description || ''} ${
      safeIndianContext.cultural_significance
    } ${safeJoin(safeIndianContext.modern_adaptations)}`.toLowerCase();

    // 3. Object Focus Vector - Furniture, materials, features
    const objectTypes = safeJoin(safeMap(objects, (obj) => obj.type || ''));
    const objectFeatures = safeJoin(safeFlatMap(objects, (obj) => obj.features || []));
    const materials = safeJoin(safeVisualAttributes.materials);
    const features = safeJoin(primary_features);

    const objectFocusText =
      `${objectTypes} ${objectFeatures} ${materials} ${features} ${safeJoin(safeVisualAttributes.colors)}`.toLowerCase();
>>>>>>> origin/main

    // Generate all three embeddings
    const [primarySearchVector, semanticDescVector, objectFocusVector] =
      await Promise.all([
        this.getEmbedding(primarySearchText),
        this.getEmbedding(semanticDescText),
        this.getEmbedding(objectFocusText),
      ]);

<<<<<<< HEAD
    // Quality assessment and logging
    this.logEmbeddingQuality(imageId, {
      primary_search: primarySearchText,
      semantic_desc: semanticDescText,
      object_focus: objectFocusText,
    });

=======
>>>>>>> origin/main
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
<<<<<<< HEAD
    await this.initializeExtractor();
    try {
      // The extractor returns a Tensor, use .tolist() to get a JS array
      const output = await this.extractor(text, { pooling: "mean", normalize: true });
      // output is a Tensor, convert to array
      return output.tolist()[0]; // [0] because input is a single string
    } catch (error) {
      console.error("Error creating embedding with HuggingFace:", error);
=======
    try {
      const response = await this.openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error("Error creating embedding:", error);
>>>>>>> origin/main
      throw new Error("Failed to create embedding");
    }
  }

  async tokenizeText(text) {
<<<<<<< HEAD
    // This method is no longer needed as tokenization is handled by the extractor
    // Keeping it for now, but it will always return an empty array
    return [];
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
=======
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


>>>>>>> origin/main
}

export default new EmbeddingService();
